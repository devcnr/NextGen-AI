from flask import Flask, render_template, session, redirect, url_for, request, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import requests
import os

app = Flask(__name__)

basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'database.db')
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = "secret_key"

db = SQLAlchemy(app)

API_KEY = ''
API_URL = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={API_KEY}'

headers = {
    'Content-Type': 'application/json',
}

# Mod
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    chats = db.relationship('Chat', backref='user', lazy=True)

class Chat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    messages = db.relationship('Message', backref='chat', lazy=True)
    is_saved = db.Column(db.Boolean, default=False)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(10), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    chat_id = db.Column(db.Integer, db.ForeignKey('chat.id'), nullable=False)


def init_db():
    """Initialize the database and create all tables"""
    with app.app_context():
        db.create_all()
        print("Database initialized successfully!")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/")
def main():
    if "user_id" not in session:
        return redirect(url_for("login"))
    return redirect(url_for("ai"))
    

@app.route("/ai")
def ai():
    if "user_id" not in session:
        return redirect(url_for("login"))
    
    user = User.query.get(session["user_id"])
    chats = Chat.query.filter_by(user_id=session["user_id"]).order_by(Chat.created_at.desc()).all()
    return render_template("ai.html", chats=chats, user=user)


@app.route("/chat/new", methods=["POST"])
def new_chat():
    if "user_id" not in session:
        return jsonify({"error": "Giriş yapmalısınız."}), 401

    chat = Chat(user_id=session["user_id"])
    db.session.add(chat)
    db.session.commit()
    return jsonify({
        "chat_id": chat.id,
        "created_at": chat.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }), 201

@app.route("/chat/<int:chat_id>/messages", methods=["GET", "POST"])
def chat_messages(chat_id):
    if "user_id" not in session:
        return jsonify({"error": "Giriş yapmalısınız."}), 401

    chat = Chat.query.filter_by(id=chat_id, user_id=session["user_id"]).first_or_404()

    if request.method == "GET":
        messages = Message.query.filter_by(chat_id=chat_id).order_by(Message.created_at).all()
        return jsonify([{
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
        } for msg in messages])

    data = request.get_json()
    user_message = data.get("message")

    if not user_message:
        return jsonify({"error": "Boş mesaj gönderilemez."}), 400


    new_message = Message(role="user", content=user_message, chat_id=chat_id)
    db.session.add(new_message)
    db.session.commit()


    conversation_history = [
        {
            "role": "user" if msg.role == "user" else "model",
            "content": msg.content
        } for msg in chat.messages
    ]


    api_request = {
        "contents": [{
            "role": "user",
            "parts": [{"text": user_message}]
        }]
    }

    try:
        response = requests.post(API_URL, headers=headers, json=api_request)
        
        print("API Response:", response.text)  

        if response.status_code == 200:
            result = response.json()
            try:
                model_reply = result["candidates"][0]["content"]["parts"][0]["text"]

                ai_message = Message(role="model", content=model_reply, chat_id=chat_id)
                db.session.add(ai_message)
                db.session.commit()

                return jsonify({
                    "role": "model",
                    "content": model_reply,
                    "created_at": ai_message.created_at.strftime("%Y-%m-%d %H:%M:%S")
                })
            except (KeyError, IndexError) as e:
                print(f"API yanıt parse hatası: {e}")
                print(f"API yanıtı: {result}")
                return jsonify({
                    "error": "API yanıtı işlenirken hata oluştu",
                    "details": str(e)
                }), 500
        else:
            print(f"API Hata Kodu: {response.status_code}")
            print(f"API Hata Detayı: {response.text}")
            return jsonify({
                "error": f"API hatası: {response.status_code}",
                "details": response.text
            }), 500
    except Exception as e:
        print(f"İstek hatası: {e}")
        return jsonify({
            "error": "API isteği sırasında hata oluştu",
            "details": str(e)
        }), 500
    
@app.route("/chats", methods=["GET"])
def get_chats():
    if "user_id" not in session:
        return jsonify({"error": "Giriş yapmalısınız."}), 401

    chats = Chat.query.filter_by(user_id=session["user_id"]).order_by(Chat.created_at.asc()).all()
    
    chat_list = []
    for index, chat in enumerate(chats, start=1):
        chat_list.append({
            "id": chat.id,
            "name": f"Sohbet {index}", 
        })

    return jsonify(chat_list)

@app.route("/chat/<int:chat_id>")
def get_chat(chat_id):
    if "user_id" not in session:
        return redirect(url_for("login"))
    
    chat = Chat.query.filter_by(id=chat_id, user_id=session["user_id"]).first_or_404()
    messages = Message.query.filter_by(chat_id=chat_id).order_by(Message.created_at).all()
    return render_template("ai.html", current_chat=chat, messages=messages)

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]

        user = User.query.filter_by(email=email).first()
        if user and user.password == password:
            session["user_id"] = user.id
            flash("Başarıyla giriş yaptınız!", "success")
            return redirect(url_for("ai"))
        else:
            flash("Geçersiz e-posta veya şifre", "error")
    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form["username"]
        email = request.form["email"]
        password = request.form["password"]

        if User.query.filter_by(email=email).first():
            flash("Bu e-posta adresi zaten kullanılıyor.")
            return redirect(url_for("register"))
        if User.query.filter_by(username=username).first():
            flash("Bu kullanıcı adı zaten kullanılıyor.")
            return redirect(url_for("register"))

        new_user = User(username=username, email=email, password=password)
        db.session.add(new_user)
        db.session.commit()

        flash("Başarıyla kayıt olundu", "success")
        return redirect(url_for("login"))

    return render_template("register.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/api/chat/<int:chat_id>/delete", methods=["POST"])
def delete_chat(chat_id):
    try:
        if "user_id" not in session:
            return jsonify({"error": "Giriş yapmalısınız."}), 401

        chat = Chat.query.filter_by(id=chat_id, user_id=session["user_id"]).first()
        if not chat:
            return jsonify({"error": "Sohbet bulunamadı."}), 404
        
    
        Message.query.filter_by(chat_id=chat_id).delete()
        
        db.session.delete(chat)
        db.session.commit()

        return jsonify({"message": "Sohbet başarıyla silindi"})
    except Exception as e:
        db.session.rollback()  
        return jsonify({"error": f"Sohbet silinirken bir hata oluştu: {str(e)}"}), 500

@app.route('/chat/<int:chat_id>/edit', methods=['PUT'])
def edit_chat(chat_id):

    data = request.get_json()
    new_name = data.get('name')

 
    if not new_name:
        return jsonify({"error": "Sohbet adı boş olamaz"}), 400

  
    chat = Chat.query.filter_by(id=chat_id, user_id=session["user_id"]).first()
    if not chat:
        return jsonify({"error": "Sohbet bulunamadı"}), 404

  
    chat.name = new_name
    db.session.commit()

    return jsonify({"message": "Sohbet adı güncellendi"}), 200

@app.route("/chats/saved", methods=["GET"])
def get_saved_chats():
    if "user_id" not in session:
        return jsonify({"error": "Giriş yapmalısınız."}), 401

    saved_chats = Chat.query.filter_by(user_id=session["user_id"], is_saved=True).order_by(Chat.created_at.desc()).all()
    
    return jsonify([{
        "id": chat.id,
        "name": f"Sohbet {chat.id}",  # Sohbet 1, Sohbet 2, ...
        "created_at": chat.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "last_message": chat.messages[-1].content if chat.messages else "Sohbet başlatıldı"
    } for chat in saved_chats])

@app.route("/save_chat/<int:chat_id>", methods=["POST"])
def save_chat(chat_id):
    if "user_id" not in session:
        return jsonify({"error": "Giriş yapmalısınız."}), 401

    chat = Chat.query.filter_by(id=chat_id, user_id=session["user_id"]).first_or_404()
    chat.is_saved = True
    db.session.commit()

    return jsonify({"message": "Sohbet başarıyla kaydedildi"})

with app.app_context():
    try:
        db.create_all()
        print("Database tables created successfully!")
    except Exception as e:
        print(f"Error creating database tables: {e}")

        

if __name__ == "__main__":
    app.run(debug=True)