from Orion import db, create_app
from Orion.auth.userModel import User

app = create_app()

with app.app_context():
    db.drop_all()
    db.create_all()