import pandas as pd
import json
import os
from openai import OpenAI

# 1. הגדרת לקוח OpenAI
# ניתן להגדיר את המפתח כאן ישירות או כמשתנה סביבה
client = OpenAI(api_key="")

def generate_therapist_embeddings(input_csv, output_json):
    # 2. טעינת הנתונים מה-CSV
    print(f"Loading {input_csv}...")
    df = pd.read_csv(input_csv)
    
    final_data = []
    
    print(f"Starting vector generation for {len(df)} therapists using text-embedding-3-small...")

    for index, row in df.iterrows():
        full_name = str(row['FullName']).strip()
        license = str(row['LicenseNumber']).strip()
        bio = str(row['Bio']).strip() if pd.notnull(row['Bio']) else ""
        specialties = str(row['Specialties']).strip() if pd.notnull(row['Specialties']) else ""
        
        # 3. בניית מחרוזת הטקסט בדיוק לפי הלוגיקה של ה-Register ב-C#
        # "Name. Specialties: ... Bio: ..."
        text_to_embed = f"{full_name}. Specialties: {specialties}. Bio: {bio}"
        
        try:
            # 4. יצירת הוקטור במימד 1536
            response = client.embeddings.create(
                input=text_to_embed,
                model="text-embedding-3-small"
            )
            
            # שליפת הוקטור כמערך של Floats
            embedding_vector = response.data[0].embedding
            
            # 5. יצירת אובייקט שתואם למבנה של ה-Class ב-C#
            therapist_entry = {
                "FullName": full_name,
                "LicenseNumber": license,
                "Bio": bio,
                "Specialties": specialties,
                "EmbeddingVector": embedding_vector  # נשמר כמערך מספרים (JSON Array)
            }
            
            final_data.append(therapist_entry)
            print(f"Successfully processed: {full_name}")
            
        except Exception as e:
            print(f"Error processing {full_name}: {e}")

    # 6. שמירה לקובץ JSON
    # שימוש ב-JSON מבטיח ש-RavenDB יזהה את הוקטור כמערך נומרי ולא כטקסט
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)

    print(f"\nDone! Created {output_json} with {len(final_data)} entries.")
    print("Now you can import this JSON file into RavenDB via 'Settings -> Import Data'.")

if __name__ == "__main__":
    generate_therapist_embeddings('Therapists.csv', 'Therapists_Updated.json')