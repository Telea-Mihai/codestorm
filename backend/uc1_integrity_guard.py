import os
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# ---------------------------------------------------------
# 1. Definim Schema folosind Pydantic V2
# Aceasta clasă se va converti automat în JSON-ul cerut.
# ---------------------------------------------------------
class RaportIntegritate(BaseModel):
    missing_sections: list[str] = Field(
        description="Lista de sectiuni de document lipsa complet."
    )
    missing_values: list[str] = Field(
        description="Lista de descrieri ale valorilor lipsa sau goale pe document."
    )

def verifica_integritate_document(file_path: str):
    # Initializam clientul (Asigura-te ca ai variabila de mediu GEMINI_API_KEY setata)
    # Ex: os.environ["GEMINI_API_KEY"] = "cheia_ta"
    client = genai.Client(
        api_key="AIzaSyA-MpGWCTJRmY18k7EgVZb2uQLp6-1I-io"
    )

    print(f"Încărcăm fișierul {file_path}...")
    # Incarcam vizual fisierul in AI (PDF/Imagine)
    uploaded_file = client.files.upload(file=file_path)

    # ---------------------------------------------------------
    # 2. Instrucțiuni de Sistem ("Sugestii / Comportament General")
    # Echivalentul campului "System Instructions" din Google AI Studio.
    # ---------------------------------------------------------
    sugestii_sistem = (
        "Ești un auditor academic extrem de exigent. "
        "Fii foarte atent la document. Dacă observi că există tabele fără "
        "câmpuri completate sau lipsește clar rubrica de 'Bibliografie', "
        "raportează imediat. Nu inventa secțiuni care nu ar trebui să existe."
    )

    # 3. Promptul Efectiv (User Input) - preluat din planul pentru UC 1.1
    prompt = """
    I have attached the visual document for a university course file.
    Your task is to visually scan the file and identify missing elements.

    Visually inspect the document for:
    1. "missing_sections": Identify if any standard structural sections appear to be completely missing compared to a normal academic syllabus.
    2. "missing_values": Locate sections that are present but empty, or contain placeholder text (for example: an empty bibliography section, or missing signatures at the approval area).
    """

    print("Procesăm documentul cu Gemini Flash...")
    
    # 4. Apelul catre Gemini unde injectam schema Pydantic si Instructiunile de Sistem
    response = client.models.generate_content(
        model='gemini-3-flash-preview', # Poti folosi 'gemini-1.5-pro' pt logica mai avansata
        contents=[
            uploaded_file, 
            prompt
        ],
        config=types.GenerateContentConfig(
            # Aici fortam formatul de JSON Strict bazat pe clasa de mai sus
            response_mime_type="application/json",
            response_schema=RaportIntegritate,
            
            # AICI adaugi "Sugestiile" generale din AI Studio
            system_instruction=sugestii_sistem,
            
            # Parametri optimi pt extragere de date matematice/structurale
            temperature=0.0 
        ),
    )

    # Adaugă acest print ca să vezi realitatea brută a ceea ce trimite Google în spate
    print("\n--- RAW JSON DE LA GOOGLE ---")
    print(response.text) 
    print("-----------------------------")

    # Convertim string-ul de JSON primit de la AI înapoi în obiect tipizat Python
    DateExtrase = RaportIntegritate.model_validate_json(response.text)
    
    return DateExtrase

# ---- Exemplu de utilizare a functiei ----
if __name__ == "__main__":
    # Ai nevoie de un fisier de test pentru rulare. Poti inlocui cu un pdf real.
    fisier_test = "fisa_disciplina-pages-2.pdf" 
    
    # Executam doar daca fisierul exista pe disk
    if os.path.exists(fisier_test):
        raport = verifica_integritate_document(fisier_test)
        
        print("\n--- REZULTAT ---")
        print(f"Secțiuni Lipsă ({len(raport.missing_sections)} găsite):")
        for sectiune in raport.missing_sections:
            print(f" - {sectiune}")
            
        print(f"\nValori Lipsă/Goale ({len(raport.missing_values)} găsite):")
        for valoare in raport.missing_values:
            print(f" - {valoare}")
    else:
        print(f"Creează un fișier '{fisier_test}' în acest folder pentru a testa codul.")

