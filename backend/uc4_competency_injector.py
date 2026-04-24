import os
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from docxtpl import DocxTemplate

# ---------------------------------------------------------
# 1. Definim Schema Pydantic pt "Planul de Învățământ"
# ---------------------------------------------------------
class CursBootstrappingSchema(BaseModel):
    disciplina: str = Field(description="Numele exact al materiei/disciplinei cautate.")
    an_studiu: int = Field(description="Anul de studiu extras.")
    numar_credite: int = Field(description="Numarul de credite ECTS.")
    tip_evaluare: str = Field(description="Tipul de evaluare (Examen, Colocviu, Verificare pe parcurs etc).")
    competente_specifice: list[str] = Field(description="Lista cu textele/codurile competentelor vizate.")

# ---------------------------------------------------------
# 2. Extragerea Datelor din Sursa Adevărului (Planul)
# ---------------------------------------------------------
def extrage_date_plan(file_path: str, materie_cautata: str) -> dict:
    client = genai.Client(api_key="AIzaSyA-MpGWCTJRmY18k7EgVZb2uQLp6-1I-io")

    print(f"1. AI citește sursa oficială: {file_path} ...")
    uploaded_file = client.files.upload(file=file_path)

    prompt = f"""
    I have attached the visual document for an academic "Plan de Învățământ".
    Your task is to visually scan the massive tables to locate the specific course/subject named '{materie_cautata}'.

    Once found, trace across its row to extract the Year (An), Credits (Credite), Evaluation type, and ALL associated Competencies (Competențe).
    Output these fixed fields exactly as requested by the JSON schema.
    """

    response = client.models.generate_content(
        model='gemini-2.5-flash', # Aici folosim musai Pro, Planul de invatamant este foarte complex vizual!
        contents=[uploaded_file, prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=CursBootstrappingSchema,
            temperature=0.0
        ),
    )
    
    # 3. Printam si transformam inapoi in dictionar Python util pentru Docx
    DateExtrase = CursBootstrappingSchema.model_validate_json(response.text)
    
    print("\n[✔] Date extrase de AI cu succes:")
    print(f" - Disciplina: {DateExtrase.disciplina} | Anul: {DateExtrase.an_studiu} | Credite: {DateExtrase.numar_credite}")
    print(f" - Competențe: {len(DateExtrase.competente_specifice)} găsite")
    
    # Trebuie sa le convertim la Dictionar (.model_dump()) pentru a le pune in MS Word
    return DateExtrase.model_dump()


# ---------------------------------------------------------
# 3. Injectarea ("Bootstrapping") in Documentul Nou
# ---------------------------------------------------------
def genereaza_draft_word(date_injectare: dict, template_path: str, output_path: str):
    print(f"\n2. Injectăm datele in șablonul gol: {template_path} ...")
    
    # Incarcam sablonul Word
    doc = DocxTemplate(template_path)
    
    # Aici are loc MAGIA: Toate variabilele tip {{ an_studiu }} sau {{ disciplina }} 
    # din Word vor fi inlocuite automat cu valorile din dicționarul de mai sus!
    doc.render(date_injectare)
    
    # Salvăm rezultatul
    doc.save(output_path)
    print(f"[✔] DRAFT FINALIZAT: Fișierul a fost salvat cu numele '{output_path}'.")
    print("Profesorul/AI-ul poate completa acum mai departe tematica!")


# ---- Executie Flux ----
if __name__ == "__main__":
    # Acesta e fisierul imens oficial de unde AI-ul extrage
    fisier_sursa_plan = "plan_invatamant.pdf" 
    
    # Acesta este un Word pregatit in prealabil care contine tag-urile magice jinja
    fisier_sablon_word = "template_gol.docx"
    
    fisier_rezultat = "Draft_Initializat_Fisa_Disciplinei.docx"
    materie_test = "Fundamentele programării "

    if os.path.exists(fisier_sursa_plan) and os.path.exists(fisier_sablon_word):
        # Pas 1: Obtinem Contextul
        context_cautare = extrage_date_plan(fisier_sursa_plan, materie_test)
        
        # Pas 2: Generam Fisierul (Business Link: Generarea API a proformei)
        # Observa cum lasam AI-ul pe dinafara la generare text, pastrand stabilitatea formatarii pe python.
        genereaza_draft_word(context_cautare, fisier_sablon_word, fisier_rezultat)
    else:
        print("Atentie: Lipsesc fisierele necesare pe disk pentru a rula acest demo.")
