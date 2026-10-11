from __future__ import annotations

import os

from flask import Flask
from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect

db = SQLAlchemy()

# The key that signs login cookies. It is "devs" unless ORION_SECRET_KEY is set. Fine on
# a laptop and for a demo; before a real public launch pick a long random one, because
# anyone who knows the key can forge a login cookie.
SECRET_KEY = "devs"


def create_app(config_object: object | None = None) -> Flask:
    app = Flask(__name__, instance_relative_config=False)

    login_manager = LoginManager()
    login_manager.login_view = "auth.sign_in"
    login_manager.init_app(app)

    app.config.from_mapping(
        SECRET_KEY=os.environ.get("ORION_SECRET_KEY") or SECRET_KEY,
        SQLALCHEMY_DATABASE_URI=os.environ.get("ORION_DATABASE_URI", "sqlite:///db.sqlite3"),
    )
    if config_object is not None:
        app.config.from_object(config_object)

    db.init_app(app)

    print("Configured database URI:", app.config["SQLALCHEMY_DATABASE_URI"])
    with app.app_context():
        print("Web app database:", db.engine.url)
        print("Web app tables:", db.inspect(db.engine).get_table_names())

    from .auth.userModel import User

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    from .auth.auth import auth_bp
    from .landing.landing import landing_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(landing_bp)

    return app
