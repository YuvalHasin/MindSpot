import json
import pandas as pd

def json_to_csv(input_json, output_csv):
    print(f"טוען את הקובץ {input_json}...")
    
    # 1. קריאת ה-JSON
    with open(input_json, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 2. הפיכה ל-DataFrame של Pandas
    df = pd.DataFrame(data)
    
    # 3. טיפול בוקטור: 
    # אנחנו רוצים שהוקטור יישמר בפורמט [0.1, 0.2, ...] כטקסט בתוך ה-CSV
    # Pandas עושה את זה אוטומטית אם הערך הוא רשימה (list)
    
    # 4. שמירה ל-CSV
    # index=False מונע הוספת עמודת מספר שורה מיותרת
    df.to_csv(output_csv, index=False, encoding='utf-8-sig')
    
    print(f"ההמרה הושלמה! הקובץ נשמר בכתובת: {output_csv}")
    print(f"מספר שורות שעובדו: {len(df)}")

if __name__ == "__main__":
    # וודא שהשם תואם לקובץ שיצרת קודם
    json_to_csv('Therapists_Updated.json', 'Therapists_Final.csv')