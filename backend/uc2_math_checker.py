import os
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

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


def verifica_consistenta_matematica(file_path: str):
    # Folosim cheia API preluata din fisierul tau precedent
    client = genai.Client(
        api_key="AIzaSyA-MpGWCTJRmY18k7EgVZb2uQLp6-1I-io"
    )

    print(f"Încărcăm fișierul {file_path} pentru extragere matematică...")
    uploaded_file = client.files.upload(file=file_path)

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
    You are a highly precise data extraction agent. Analyze the attached academic visual document.
    Visually locate the tables or sections related to Course Hours and Evaluation (Ponderi de evaluare / Note Finale).

    Extract the specific numeric value assigned to 'Timpul total estimat' (or similar wording for total hours).
    Then, extract all the distinct percentages/weights for all evaluation methods (Examen, Seminar, Parcurs, Proiect).
    Finally, calculate visually if all the extracted percentages sum perfectly to 100%.
    """

    print("Procesăm extragerea tabelară...")
    
    # 4. Apelul catre Gemini unde injectam schema Pydantic
    response = client.models.generate_content(
        model='gemini-2.5-flash', # Folosim acelasi model Flash
        contents=[
            uploaded_file, 
            prompt
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
    
    alerte = []
    
    # 1. Verificam suma (Recalculata prin Cod Python, cea mai sigura varianta!)
    suma_totala_calculata = sum(eval.procentaj for eval in raport.evaluation_weights)
    
    if suma_totala_calculata != 100:
        alerte.append(f"Atenție: Suma procentelor de evaluare este {suma_totala_calculata}%, dar ar trebui să fie fix 100%.")
        
    # 2. Verificam valoarea dedusa de AI vs valoarea reala calculata de cod
    if not raport.is_evaluation_sum_100 and suma_totala_calculata == 100:
         alerte.append("AI-ul a marcat incorect un flag de eroare matematica la suma (AI False Positive), codul backend validează!")
         
    # 3. Alertă custom: dacă se depășesc limitele orelor! 
    if raport.total_hours <= 0:
        alerte.append("Aroare Critică: Timpul Total Estimat este mai mic sau egal cu 0 ore.")
    elif raport.total_hours > 300: # Presupunem o limita academica de 300 de ore / semestru
        alerte.append(f"Avertisment Ofertă: Ținta de ore ({raport.total_hours}) pare neobișnuit de imensă pentru un curs.")

    print(f"Total ore extrase din document: {raport.total_hours} ore")
    print(f"Repartizarea Notelor gasita:")
    for eval in raport.evaluation_weights:
        print(f"  -> {eval.nume_evaluare}: {eval.procentaj}%")
        
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
