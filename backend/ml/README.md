.env file Adi bhai ko bhej di hai...


apni use krna , meri limit hit ho jyegi



waitress use krr rhe hai



config.py file me model info hai

http://localhost:8000/  pe kholna



Gunicorn windows pe chlta nhi hai isiliye witress use kr rhe hai abb 
kyuki mujhpe linux nhi hai





Commands to run-----

venv bna lena python ka


venv/Scripts/activate

pip install -r requirements.txt


python app.py    (ek hi user allow krega)

run thisfor multiple ---->   waitress-serve --host=0.0.0.0 --port=8000 app:app






