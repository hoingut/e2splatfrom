from flask import Flask, render_template, make_response
from datetime import datetime

app = Flask(__name__, template_folder='templates', static_folder='static')

app.config.update(
    SECRET_KEY='a_very_secret_key_for_production',
    DEBUG=False
)

@app.context_processor
def inject_global_variables():
    return dict(current_year=datetime.utcnow().year)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/products')
def all_products():
    return render_template('products.html')

@app.route('/product/<product_id>')
def single_product(product_id):
    page_title = f"Product Details"
    return render_template('product.html', product_id=product_id, title=page_title)

@app.route('/login')
def login():
    return render_template('login.html', title="Login or Signup")

@app.route('/account')
def account():
    return render_template('account.html', title="My Account")

@app.route('/checkout')
def checkout():
    return render_template('checkout.html', title="Checkout")

@app.route('/menu')
def menu():
    return render_template('menu.html', title="Menu")

@app.route('/admin')
def admin_panel():
    return render_template('admin.html', title="Admin Panel")

@app.errorhandler(404)
def not_found_error(error):
    response = make_response(render_template('404.html'), 404)
    return response

# app.py

# ... (আপনার অন্যান্য রুটগুলো আগের মতোই থাকবে) ...

@app.route('/admin/orders')
def admin_orders():
    return render_template('admin-orders.html', title="Order Management")

@app.route('/admin/users')
def admin_users():
    """
    Renders the dedicated user management page (admin-users.html).
    এই নতুন রুটটি ইউজার ম্যানেজমেন্ট পেজ দেখানোর জন্য।
    """
    return render_template('admin-users.html', title="User Management")

# ... (বাকি কোড আগের মতোই থাকবে) ...

@app.errorhandler(500)
def internal_error(error):
    response = make_response(render_template('500.html'), 500)
    return response

if __name__ == '__main__':
    app.run()
