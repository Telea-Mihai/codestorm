import os

from google.genai import types
from pydantic import BaseModel, Field

from gemini_config import get_gemini_client
from parsers.syllabus_diff import extract_text_by_extension

# ---------------------------------------------------------
# 1. Definim Schema Pydantic pt "The Sync Master"
# ---------------------------------------------------------
class ComparatieCamp(BaseModel):
    nume_camp: str = Field(description="Numele parametrului comparat (ex: 'Denumire Materie', 'Număr Credite', 'Tip Evaluare')")
    valoare_in_fisa: str = Field(description="Valoarea găsită în Fișa Disciplinei (Document 1)")
    valoare_in_plan: str = Field(description="Valoarea găsită în Planul de Învățământ (Document 2 - Sursa Adevărului)")
    este_potrivire_exacta: bool = Field(description="True dacă valorile înseamnă fix același lucru, False dacă e conflict.")
    descriere_conflict: str = Field(description="Dacă e conflict, explică diferența (ex: 'Planul cere Examen, dar Fișa are Colocviu'). Altfel scrie 'Fără conflict'.")

class RaportSync(BaseModel):
    numele_materiei_analizate: str = Field(description="Numele materiei/disciplinei despre care e vorba în Fișa extrasă.")
    lista_comparatii: list[ComparatieCamp] = Field(description="Rezultatul validării cross-document pentru cele 3 elemente cheie cerute.")
    are_conflicte_critice: bool = Field(description="True dacă cel puțin unul dintre elementele cheie diferă.")

# ---------------------------------------------------------
# 2. Logică Sync Master (Cross-Document Match)
# ---------------------------------------------------------
def ruleaza_sync_master(fisa_path: str, plan_path: str):
    client = get_gemini_client()

    print(f"Încărcăm textele deja parse-ate pentru analiza THE SYNC MASTER...")
    fisa_text = extract_text_by_extension(fisa_path)
    plan_text = extract_text_by_extension(plan_path)

    sugestii_sistem = (
        "Ești un sistem strict de validare corporativă / academică. "
        "Verifici conformitatea datelor operaționale raportate dintr-un document de lucru (Fișa) cu cerințele "
        "contractuale globale dintr-o Sursă de Adevăr (Planul de Învățământ). Nu fi indulgent!"
    )

    prompt = """
    Analizează cu maximă atenție cele două texte parse-ate primite.
    Document 1 este Fișa Disciplinei.
    Document 2 este Planul de Învățământ.

    Sarcini:
    1. Află mai întâi despre ce materie e vorba citind titlul din Documentul 1 (Fișa).
    2. Caută acea materie exactă în Documentul 2 (Planul de Învățământ).
    3. Fă o comparație strictă pentru următoarele 3 elemente cheie:
       - Denumirea materiei (E scrisă fix la fel? O virgulă nu contează, dar cuvinte lipsă sau greșite da).
       - Numărul de credite ECTS (Trebuie să coincidă 100%).
       - Tipul de evaluare / Forma de verificare (E.g. Examen vs Colocviu / EVP).
       
    Bazează-te exclusiv pe datele scrise. Restituie rezultatul sub formatul curent de JSON cerut.
    """

    print("Procesăm validarea de conformitate...")
    response = client.models.generate_content(
        model='gemini-2.5-flash', 
        contents=[
            prompt,
            f"Document 1 - Fișa Disciplinei (parsed):\n\n{fisa_text}",
            f"Document 2 - Planul de Învățământ (parsed):\n\n{plan_text}",
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RaportSync,
            system_instruction=sugestii_sistem,
            temperature=0.0 # Foarte strict pe comparatii logice (fără halucinații)
        ),
    )

    DateExtrase = RaportSync.model_validate_json(response.text)
    return DateExtrase


# ---- Logică de Integrare Backend ----
if __name__ == "__main__":
    fisier_fisa = "fisa_disciplina-pages-2.pdf" 
    fisier_plan = "plan_invatamant.pdf" 
    
    if os.path.exists(fisier_fisa) and os.path.exists(fisier_plan):
        raport = ruleaza_sync_master(fisier_fisa, fisier_plan)
        
        print(f"\n=======================================================")
        print(f" RAPORT THE SYNC MASTER: '{raport.numele_materiei_analizate.upper()}'")
        print(f"=======================================================\n")
        
        for camp in raport.lista_comparatii:
            marcaj = "✅ PERFECT" if camp.este_potrivire_exacta else "🚨 CONFLICT"
            print(f"{marcaj} | {camp.nume_camp}:")
            print(f"      - Dată Operativă (Fișă) : {camp.valoare_in_fisa}")
            print(f"      - Sursa de Adevăr (Plan): {camp.valoare_in_plan}")
            if not camp.este_potrivire_exacta:
                print(f"      -> DETALIU ALARMĂ: {camp.descriere_conflict}")
            print("")
            
        print("-------------------------------------------------------")
        if raport.are_conflicte_critice:
            print("STATUS GLOBAL: ❌ EȘUAT. Fișa NU a trecut validarea legală (Inconsistențe mari).")
        else:
            print("STATUS GLOBAL: ✅ TRECUT. Datele coincind perfect cu Sursa de Adevăr.")
        print("-------------------------------------------------------")
    else:
        print("Aroare: Cele două documente (Fișa și Planul) nu s-au găsit pe disk.")
