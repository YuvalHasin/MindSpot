import json
import pandas as pd

# 1. טעינת ה-JSON עם הוקטורים
with open('therapists_with_embeddings.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 2. עיבוד הנתונים - הפיכת רשימת הוקטורים למחרוזת בפורמט JSON
for item in data:
    if isinstance(item.get('EmbeddingVector'), list):
        # הפיכת הרשימה לטקסט שנראה ככה: [0.1, 0.2...]
        item['EmbeddingVector'] = json.dumps(item['EmbeddingVector'])
    if isinstance(item.get('Specialties'), list):
        item['Specialties'] = ",".join(item['Specialties'])

# 3. שמירה ל-CSV
df = pd.DataFrame(data)
df.to_csv('therapists_final_for_raven.csv', index=False, encoding='utf-8-sig')

print("Done! 'therapists_final_for_raven.csv' is ready for import.")