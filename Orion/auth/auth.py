import re
from urllib.parse import urlsplit

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from .. import db
from .userModel import User

auth_bp = Blueprint(
    "auth",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/auth_static",
)

# Same rules the sign-up page checks in the browser; the server repeats them because
# the browser's checks can be skipped.
USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,20}$")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MIN_PASSWORD_LENGTH = 8
MAX_EMAIL_LENGTH = 150

# Where a successful login goes when there is no safe ?next=.
AFTER_LOGIN = "/map"


def safe_next(target):
    """`target` if it is a path on this site ("/profile"), else None.

    Only local paths are allowed so a crafted ?next=https://evil.example can't use the
    login page to bounce people to another site.
    """
    if not target or not target.startswith("/") or target.startswith(("//", "/\\")):
        return None
    parts = urlsplit(target)
    return target if not parts.scheme and not parts.netloc else None


def password_problem(password, confirm):
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    if password != confirm:
        return "Passwords do not match."
    return None


@auth_bp.route("/login", methods=["GET", "POST"])
def sign_in():
    if current_user.is_authenticated:
        return redirect(safe_next(request.args.get("next")) or url_for("auth.profile"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        user = User.query.filter(func.lower(User.email) == email).first() if email else None
        if user and check_password_hash(user.password_hash, password):
            login_user(user, remember=bool(request.form.get("remember")))
            return redirect(safe_next(request.args.get("next")) or AFTER_LOGIN)

        flash("Login unsuccessful. Please check your email and password.", "error")
        return render_template("login.html", form=request.form), 401

    return render_template("login.html", form={})


@auth_bp.route("/sign-up", methods=["GET", "POST"])
def sign_up():
    if current_user.is_authenticated:
        return redirect(url_for("auth.profile"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm_password", "")

        problem = None
        if not USERNAME_RE.match(username):
            problem = "Username must be 3-20 characters: letters, numbers or underscores."
        elif not EMAIL_RE.match(email) or len(email) > MAX_EMAIL_LENGTH:
            problem = "Enter a valid email address."
        else:
            problem = password_problem(password, confirm)
        if not problem:
            if User.query.filter(func.lower(User.email) == email).first():
                problem = "An account with that email already exists."
            elif User.query.filter(func.lower(User.username) == username.lower()).first():
                problem = "That username is taken."

        if not problem:
            db.session.add(
                User(username=username, email=email, password_hash=generate_password_hash(password), points=0)
            )
            try:
                db.session.commit()
            except IntegrityError:  # two sign-ups raced past the checks above
                db.session.rollback()
                problem = "That username or email is already registered."

        if problem:
            flash(problem, "error")
            return render_template("signup.html", form=request.form), 400

        flash("Account created. Sign in to continue.", "success")
        return redirect(url_for("auth.sign_in"))

    return render_template("signup.html", form={})


@auth_bp.route("/logout", methods=["GET", "POST"])
def logout():
    logout_user()
    return redirect("/")


@auth_bp.route("/profile")
@login_required
def profile():
    return render_template("account.html", user=current_user)


@auth_bp.route("/account/password", methods=["POST"])
@login_required
def change_password():
    current = request.form.get("current_password", "")
    new = request.form.get("new_password", "")
    confirm = request.form.get("confirm_password", "")

    problem = None
    if not check_password_hash(current_user.password_hash, current):
        problem = "Current password is incorrect."
    else:
        problem = password_problem(new, confirm)

    if problem:
        flash(problem, "error")
        return redirect(url_for("auth.profile"))

    current_user.password_hash = generate_password_hash(new)
    db.session.commit()
    flash("Password updated.", "success")
    return redirect(url_for("auth.profile"))
