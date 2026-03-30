import os
from datetime import datetime
from flask import Flask, render_template, request, url_for, redirect, g
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
import razorpay
import hmac
import hashlib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))  # optional .env

DATABASE_URL = os.environ.get("DATABASE_URL")  # Neon URI

app = Flask(__name__, template_folder="template", static_folder="static")


def get_db_conn():
    conn = getattr(g, "_pg_conn", None)
    if conn is None:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL not set")
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
        g._pg_conn = conn
    return conn


def init_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      service_type TEXT,
      from_city TEXT,
      from_point TEXT,
      to_city TEXT,
      to_point TEXT,
      journey_date DATE,
      journey_time TEXT,
      pickup_time TIME,
      seats INTEGER,
      amount NUMERIC,
      user_name TEXT,
      user_phone TEXT,
      user_email TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    """)
    conn.commit()
    cur.close()
    conn.close()


# Initialize DB only if explicitly requested (comment out auto-init for now)
# if DATABASE_URL:
#     with app.app_context():
#         init_db()

# Instead, try to init on first request
_db_initialized = False

@app.before_request
def before_req():
    global _db_initialized
    if not _db_initialized and DATABASE_URL:
        try:
            init_db()
            _db_initialized = True
        except Exception as e:
            print(f"DB init deferred: {e}")


@app.teardown_appcontext
def close_connection(exception):
    conn = getattr(g, "_pg_conn", None)
    if conn is not None:
        try:
            conn.close()
        except Exception:
            pass


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/policy")
def policy():
    return render_template("policy.html")


@app.route("/car")
def car():
    return render_template("car.html")


@app.route("/contact")
def contact():
    return render_template("contact.html")


@app.route("/booking")
def booking():
    params = request.args.to_dict()
    # Render booking.html and pass query params if needed
    return render_template('booking.html', params=params)


@app.route("/booking.html")
def booking_html():
    # support legacy/static-style links that point to booking.html
    return redirect(url_for('booking'))


@app.route("/api/book", methods=["POST"])
def api_book():
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "no json"}), 400

    # minimal validation
    service = data.get("service_type") or data.get("service")
    name = data.get("user_name")
    phone = data.get("user_phone")
    if not service or not name or not phone:
        return jsonify({"error": "missing required fields (service, user_name, user_phone)"}), 400

    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO bookings
          (service_type, from_city, from_point, to_city, to_point, journey_date, journey_time, pickup_time, seats, amount, user_name, user_phone, user_email, created_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
        """,
        (
            service,
            data.get("from"),
            data.get("from_point"),
            data.get("to"),
            data.get("to_point"),
            data.get("date") or None,
            data.get("time"),
            data.get("pickup_time") or None,
            int(data.get("seats") or 0),
            float(data.get("amount") or 0),
            name,
            phone,
            data.get("user_email"),
            datetime.utcnow(),
        ),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    return jsonify({"id": row["id"]}), 201


@app.route("/api/bookings", methods=["GET"])
def list_bookings():
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM bookings ORDER BY created_at DESC")
    rows = cur.fetchall()
    cur.close()
    return jsonify(rows)


@app.route("/admin")
def admin():
    """
    Read all bookings from Neon (Postgres) and render admin page.
    """
    conn = get_db_conn()
    cur = conn.cursor()
    # select columns you created in the bookings table
    cur.execute("""
        SELECT id, service_type, from_city, from_point, to_city, to_point,
        
               journey_date, journey_time, pickup_time, seats, amount,
               user_name, user_phone, user_email, created_at
        FROM bookings
        ORDER BY created_at DESC
    """)
    bookings = cur.fetchall()  # RealDictCursor => list of dict-like rows
    cur.close()
    return render_template("admin.html", bookings=bookings)


RZP_KEY_ID = os.environ.get("RZP_KEY_ID")
RZP_KEY_SECRET = os.environ.get("RZP_KEY_SECRET")
rzp_client = razorpay.Client(auth=(RZP_KEY_ID, RZP_KEY_SECRET)) if RZP_KEY_ID and RZP_KEY_SECRET else None


@app.route("/api/create_order", methods=["POST"])
def create_order():
    """
    Expects JSON booking summary: { amount: "1200", currency: "INR", service: "...", ... }
    Returns Razorpay order (id, amount) to open checkout on client.
    """
    body = request.get_json(force=True)
    if not body:
        return jsonify({"error":"missing json"}), 400
    amount_rupees = body.get("amount")
    if not amount_rupees:
        return jsonify({"error":"missing amount"}), 400
    try:
        amount_paise = int(float(amount_rupees) * 100)  # Razorpay needs paise
    except Exception:
        return jsonify({"error":"invalid amount"}), 400

    if not rzp_client:
        return jsonify({"error":"Razorpay keys not configured"}), 500

    # create razorpay order
    order_data = {
        "amount": amount_paise,
        "currency": body.get("currency", "INR"),
        "receipt": f"rcpt_{int(datetime.utcnow().timestamp())}",
        "payment_capture": 1  # auto-capture
    }
    try:
        order = rzp_client.order.create(data=order_data)
        # Return order + pass-through booking summary (you may also store temporary record)
        return jsonify({"order": order, "booking": body}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/verify_payment", methods=["POST"])
def verify_payment_and_save():
    """
    Verify signature from client and save booking to DB when payment is successful.
    Expects JSON:
    {
      "razorpay_payment_id": "...",
      "razorpay_order_id": "...",
      "razorpay_signature": "...",
      "booking": { ... }  // same booking summary and user info
    }
    """
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error":"missing json"}), 400

    payment_id = data.get("razorpay_payment_id")
    order_id = data.get("razorpay_order_id")
    signature = data.get("razorpay_signature")
    booking = data.get("booking")

    if not payment_id or not order_id or not signature or not booking:
        return jsonify({"error":"missing required fields"}), 400

    # Verify signature: hmac_sha256(order_id + '|' + payment_id, RZP_KEY_SECRET)
    msg = f"{order_id}|{payment_id}"
    generated_signature = hmac.new(
        RZP_KEY_SECRET.encode('utf-8'),
        msg.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(generated_signature, signature):
        return jsonify({"error":"signature mismatch"}), 400

    # Payment verified -> save booking into DB
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO bookings
              (service_type, from_city, from_point, to_city, to_point, journey_date, journey_time, pickup_time, seats, amount, user_name, user_phone, user_email, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
            """,
            (
                booking.get("service_type") or booking.get("service"),
                booking.get("from"),
                booking.get("from_point"),
                booking.get("to"),
                booking.get("to_point"),
                booking.get("date") or None,
                booking.get("time"),
                booking.get("pickup_time") or None,
                int(booking.get("seats") or 0),
                float(booking.get("amount") or 0),
                booking.get("user_name"),
                booking.get("user_phone"),
                booking.get("user_email"),
                datetime.utcnow(),
            ),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        return jsonify({"status":"ok","id": row["id"], "payment_id": payment_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/config")
def get_config():
    return jsonify({"rzp_key_id": RZP_KEY_ID or ""})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)