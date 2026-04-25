import os

from google.genai import types
from pydantic import BaseModel, Field

from gemini_config import get_gemini_client
from parsers.syllabus_diff import extract_text_by_extension

# ---------------------------------------------------------
# 1. Definim Schema folosind Pydantic V2
# Aceasta structura se va ocupa de extragerea pura a orelor si ponderilor
# ---------------------------------------------------------
class Evaluare(BaseModel):
    nume_evaluare: str = Field(description="Tipul de evaluare (ex: Examen, Colocviu, Proiect, Laborator)")
    procentaj: float = Field(description="Ponderea (procentajul) alocat acestui tip de evaluare din nota finala.")

class RaportMatematic(BaseModel):
    total_hours: float = Field(description="Numarul total de ore alocate / estimate pentru curs (timpul total estimat).")
    evaluation_weights: list[Evaluare] = Field(description="Lista cu toate metodele de evaluare gasite in document si ponderile aferente.")
    is_evaluation_sum_100: bool = Field(description="Valoare de adevar calculata DEDUSA vizual de tine: suma tuturor procentelor extrase este 100?")


def build_math_alerts(raport: RaportMatematic) -> list[str]:
    """
    Deterministic checks on top of the model output (hours bounds, sum to 100%).
    """
    alerte: list[str] = []
    suma_totala_calculata = sum(item.procentaj for item in raport.evaluation_weights)

    if suma_totala_calculata != 100:
        alerte.append(
            f"Suma procentelor de evaluare este {suma_totala_calculata}%, "
            "dar ar trebui să fie fix 100%."
        )

    if not raport.is_evaluation_sum_100 and suma_totala_calculata == 100:
        alerte.append(
            "Modelul a marcat suma ca nefiind 100%, dar recalculul din cod dă 100% — "
            "posibil fals pozitiv al modelului."
        )

    if raport.total_hours <= 0:
        alerte.append("Timpul total estimat este mai mic sau egal cu 0 ore.")
    elif raport.total_hours > 300:
        alerte.append(
            f"Ținta de ore ({raport.total_hours}) pare neobișnuit de mare pentru un curs."
        )

    return alerte


def verifica_consistenta_matematica(file_path: str):
    client = get_gemini_client()

    print(f"Încărcăm textul deja pars-at din {file_path} pentru extragere matematică...")
    document_text = extract_text_by_extension(file_path)

    # ---------------------------------------------------------
    # 2. Instrucțiuni de Sistem ("Sugestii / Comportament General")
    # ---------------------------------------------------------
    sugestii_sistem = (
        "Ești un agent matematic super-precis. Analizezi vizual un document academic (Fișa Disciplinei). "
        "Misiunea ta este să localizezi în mod specific secțiunea de Tip Evaluare și secțiunea de "
        "Ore estimate. Nu trage concluzii fără să vezi cifre reale în document. "
        "Extrage fix acele procente pe care le găsești."
    )

    # 3. Promptul Efectiv (User Input)
    prompt = """
    You are a highly precise data extraction agent. Analyze the provided parsed academic content.
    Locate the sections related to Course Hours and Evaluation (Ponderi de evaluare / Note Finale).

    Extract the specific numeric value assigned to 'Timpul total estimat' (or similar wording for total hours).
    Then, extract all the distinct percentages/weights for all evaluation methods (Examen, Seminar, Parcurs, Proiect).
    Finally, calculate whether all the extracted percentages sum perfectly to 100%.
    """

    print("Procesăm extragerea tabelară...")
    
    # 4. Apelul catre Gemini unde injectam schema Pydantic
    response = client.models.generate_content(
        model='gemini-2.5-flash', # Folosim acelasi model Flash
        contents=[
            prompt,
            f"Parsed document content:\n\n{document_text}",
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RaportMatematic,
            system_instruction=sugestii_sistem,
            temperature=0.0 # Foarte important pentru sarcini matematice, forțează precizia!
        ),
    )

    print("\n--- RAW JSON DE LA GOOGLE (UC 1.2) ---")
    print(response.text) 
    print("--------------------------------------")

    # Serializarea si validarea stricta a JSON-ului
    DateExtrase = RaportMatematic.model_validate_json(response.text)
    
    return DateExtrase


# ---- Logică de Business pe Backend ----
# Aceasta este zona unde programam Alertele dacă limitele depășesc parametrii!
def executa_business_logic(raport: RaportMatematic):
    print("\n=== RAPORT FINAL: CONSISTENȚĂ MATEMATICĂ ===")

    alerte = build_math_alerts(raport)

    print(f"Total ore extrase din document: {raport.total_hours} ore")
    print(f"Repartizarea Notelor gasita:")
    for entry in raport.evaluation_weights:
        print(f"  -> {entry.nume_evaluare}: {entry.procentaj}%")
        
    if alerte:
        print("\n[!] ALERTE DE CONFORMITATE GĂSITE [!]")
        for a in alerte:
            print(f" - {a}")
    else:
        print("\n✅ Documentul respectă integral echilibrul matematic (Timpul Total și 100% Notare).")


# ---- Rularea Scriptului ----
if __name__ == "__main__":
    fisier_test = "fisa_disciplina-pages-2.pdf"  # Folosim acelasi document PDF ca mai devreme!
    
    if os.path.exists(fisier_test):
        raport = verifica_consistenta_matematica(fisier_test)
        
        # Trimitem structura scoasa din PDF mai departe catre validarea de logica
        executa_business_logic(raport)
    else:
        print(f"Eroare: Nu găsesc fișierul de test '{fisier_test}'.")
