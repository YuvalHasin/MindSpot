import pandas as pd

# 1. טעינת הקבצים
df_therapists = pd.read_csv('therapists.csv')
df_final = pd.read_csv('therapists_final.csv')

# 2. הוספת העמודה ישירות (בהנחה שהסדר זהה)
df_final['LicenseNumber'] = df_therapists['LicenseNumber']

# 3. שמירה
df_final.to_csv('therapists_final_updated.csv', index=False)

print("העמודה התווספה בהצלחה!")