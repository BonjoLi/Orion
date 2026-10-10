from flask import Blueprint, render_template, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date
from flask_login import login_user, current_user, logout_user
from .userModel import User
from .. import db

auth_bp = Blueprint(
    "auth",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path='/auth_static',
)


@auth_bp.route("/sign-in", methods=["GET", "POST"])
def sign_in():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "").strip()

        user = User.query.filter_by(email=email).first()

        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for("landing.index"))

        flash("Login unsuccessful. Please check your email and password.", "error")

    return render_template("sign_in.html")

@auth_bp.route("/sign-up", methods=["GET", "POST"])
def sign_up():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "").strip()
        confirm_password = request.form.get("confirm_password", "").strip()

        fields = [("Name", username), ("Email", email), ("Password", password)]
        missing = [label for label, value in fields if not value]
        if missing:
            flash(f"Please fill in your {' and '.join(missing)}.", "error")
        else:
            user = User.query.filter_by(email=email).first()
            if user:
                flash("An account with that email already exists.", "error")
                return redirect(url_for("auth.sign_up"))
            if password != confirm_password:
                flash("Passwords do not match.", "error")
                return redirect(url_for("auth.sign_up"))
            new_user = User(
                username=username,
                email=email,
                password_hash=generate_password_hash(password),
                points=0
            )

            db.session.add(new_user)
            db.session.commit()

            return redirect(url_for("auth.sign_in"))

    return render_template("sign_up.html")

@auth_bp.route("/profile")
def profile():
    return render_template("profile.html", user=current_user)
