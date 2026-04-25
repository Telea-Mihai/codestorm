import os

from google.genai import types
from pydantic import BaseModel, Field

from gemini_config import get_gemini_client
from parsers.syllabus_diff import extract_text_by_extension

# ---------------------------------------------------------
# 1. Definim Schema folosind Pydantic V2 pt Cross-Mapping
# ---------------------------------------------------------
class EvaluareCompetenta(BaseModel):
    cod_sau_descriere: str = Field(description="Competenta gasita in Fisa Disciplinei (ex: CP1, CT2 sau textul efectiv).")
    scrisa_corect_conform_planului: bool = Field(description="Adevarat DOAR DACA textul/codul din Fisa exista indentic (sau 95% similar) si in Planul de Invatamant.")
    se_potriveste_cu_obiectivele: bool = Field(description="In contextul numarului materiei si a obiectivelor formulate in Fisa, are sens aceasta competenta?")
    recomandare_AI: str = Field(description="Daca e gresita, propune competenta corecta din Planul de Invatamant. Daca e buna, confirma pe scurt de ce.")

class RaportMapping(BaseModel):
    analiza_competente_profesionale: list[EvaluareCompetenta] = Field(description="Maparea pentru competentele profesionale (CP)")
    analiza_competente_transversale: list[EvaluareCompetenta] = Field(description="Maparea pentru competentele transversale (CT)")
    concluzie_generala: str = Field(description="O propozitie de sumarizare a calitatii maparii (ex: 3 din 4 competente sunt gresite conform planului).")


def mapper_competente_cross_document(fisa_path: str, plan_path: str):
    client = get_gemini_client()

    print(f"Încărcăm textele deja parse-ate pentru analiza CROSS-DOCUMENT...")
    fisa_text = extract_text_by_extension(fisa_path)
    plan_text = extract_text_by_extension(plan_path)

    # ---------------------------------------------------------
    # 2. Instrucțiuni de Sistem ("Sugestii / Comportament General")
    # ---------------------------------------------------------
    sugestii_sistem = (
        "Ești un ofițer de compliance universitar. Trebuie să asiguri calitatea Cross-Document. "
        "Document 1 este Fișa Disciplinei (produsul profesorului). "
        "Document 2 este Planul de Învățământ (legea). "
        "Fii strict: dacă o competență din Fișă nu se regăsește în Plan, trebuie marcată ca invalidă "
        "și trebuie să-i sugerezi una din Plan care se potrivește cu obiectivele cursului."
    )

    # 3. Promptul Efectiv (User Input)
    prompt = """
    Analizeaza ambele documente parse-ate primite.

    PASUL 1: Citeste 'Obiectivele cursului' si 'Denumirea materiei' din Documentul 1 (Fisa Disciplinei).
    PASUL 2: Identifica sectiunea cu 'Competente profesionale/transversale' din Documentul 1.
    PASUL 3: Verifica daca aceleasi competente declarate de profesor exista oficial in Documentul 2 (Planul de Invatamant).
    PASUL 4: Verifica semantic daca obiectivele de la Pasul 1 au legatura reala cu acele competente.

    Extrage analiza finala organizata sub forma de lista asa cum este impus in schema JSON.
    """

    print("Procesăm mapările semantice (Va dura câteva secunde)...")
    
    # 4. Apelul catre Gemini unde injectam ambele documente si schema Pydantic
    response = client.models.generate_content(
        model='gemini-2.5-flash', # Model rapid + precis
        contents=[
            prompt,
            f"Document 1 - Fișa Disciplinei (parsed):\n\n{fisa_text}",
            f"Document 2 - Planul de Învățământ (parsed):\n\n{plan_text}",
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RaportMapping,
            system_instruction=sugestii_sistem,
            temperature=0.2 # Usor ridicata de la 0 pentru a permite rationamente pe 'recomandare'
        ),
    )

    # Convertim JSON-ul intr-un obiect manipulabil Python
    DateExtrase = RaportMapping.model_validate_json(response.text)
    
    return DateExtrase


# ---- Logică de Integrare UI Backend ----
if __name__ == "__main__":
    fisier_fisa = "fisa_disciplina-pages-2.pdf" 
    fisier_plan = "plan_invatamant.pdf" 
    
    if os.path.exists(fisier_fisa) and os.path.exists(fisier_plan):
        raport = mapper_competente_cross_document(fisier_fisa, fisier_plan)
        
        print("\n=======================================================")
        print(" RAPORT DE COMPLIANCE: MAPPING COMPETENȚE (UC 2.2)")
        print("=======================================================\n")
        
        print(">>> COMPETENȚE PROFESIONALE:")
        for cp in raport.analiza_competente_profesionale:
            status = "✅ CONFORM" if cp.scrisa_corect_conform_planului else "❌ NECONFORM"
            potrivire_logica = "OK" if cp.se_potriveste_cu_obiectivele else "ALARMĂ SEMANTICĂ"
            print(f"[{status} | {potrivire_logica}] {cp.cod_sau_descriere}")
            if not cp.scrisa_corect_conform_planului or not cp.se_potriveste_cu_obiectivele:
                print(f"   💡 RECOMANDARE: {cp.recomandare_AI}")
                
        print("\n>>> COMPETENȚE TRANSVERSALE:")
        for ct in raport.analiza_competente_transversale:
            status = "✅ CONFORM" if ct.scrisa_corect_conform_planului else "❌ NECONFORM"
            potrivire_logica = "OK" if ct.se_potriveste_cu_obiectivele else "ALARMĂ SEMANTICĂ"
            print(f"[{status} | {potrivire_logica}] {ct.cod_sau_descriere}")
            if not ct.scrisa_corect_conform_planului or not ct.se_potriveste_cu_obiectivele:
                print(f"   💡 RECOMANDARE: {ct.recomandare_AI}")

        print(f"\n📢 CONCLUZIE AGREGATĂ: {raport.concluzie_generala}")
        
    else:
        print("Aroare: Cele două documente (Fișa și Planul) nu s-au găsit pe disk pentru analiza comparativă.")
