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

@app.route('/pf')
def pf_home():
    """Renders the PROFITFLUENCE homepage."""
    return render_template('pf_home.html', title="PROFITFLUENCE - Home")

@app.route('/pf/work/<work_id>')
def pf_work_details(work_id):
    """Renders the details of a specific work/job post."""
    return render_template('pf_work_details.html', title="Work Details")

@app.route('/pf/influencer/<user_id>')
def pf_influencer_profile(user_id):
    """Renders the public profile of an influencer."""
    return render_template('pf_influencer_profile.html', title="Influencer Profile")

# --- Normal User / Brand Routes (Requires Login) ---
@app.route('/pf/dashboard')
def pf_user_dashboard():
    """Renders the dashboard for a normal user or brand."""
    return render_template('pf_user_dashboard.html', title="My Dashboard")

@app.route('/pf/dashboard/ad')
def pf_post_ad():
    """Renders the form for a brand to post a new job."""
    return render_template('pf_post_ad.html', title="Post a New Job")

@app.route('/pf/apply-influencer')
def pf_apply_influencer():
    """Renders the form for a user to apply to become an influencer."""
    return render_template('pf_apply_influencer.html', title="Apply for Influencer Program")

# --- Influencer-Specific Routes (Requires Login & 'influencer' role) ---
@app.route('/pf/dashboard/i')
def pf_influencer_dashboard():
    """Renders the main dashboard for an approved influencer."""
    return render_template('pf_influencer_dashboard.html', title="Influencer Dashboard")

@app.route('/pf/dashboard/withdraw')
def pf_influencer_withdraw():
    """Renders the withdrawal page for an influencer."""
    return render_template('pf_influencer_withdraw.html', title="Withdraw Funds")

@app.route('/pf/dashboard/i/ad')
def pf_influencer_post_ad():
    """Renders the form for an influencer to post their 'Ready Package' ad."""
    return render_template('pf_influencer_post_ad.html', title="Post Your Service")

@app.route('/pf/dashboard/inbox')
def pf_influencer_inbox():
    """Renders the inbox/messaging page for an influencer."""
    return render_template('pf_influencer_inbox.html', title="Inbox")

@app.route('/pf/dashboard/settings')
def pf_influencer_settings():
    """Renders the settings page for an influencer."""
    return render_template('pf_influencer_settings.html', title="Settings")

@app.route('/affiliate')
def affiliate():
    return render_template('t.html')
    
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

@app.route('/wp')
def wp():
    return render_template('z.html', title="Login or Signup")


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
# app.py

# ... (আপনার পুরনো রুটগুলো যেমন আছে থাকবে) ...

# --- New Admin Routes for Affiliate System ---
@app.route('/admin/affiliates')
def admin_affiliates():
    return render_template('admin-affiliates.html', title="Affiliate Management")

@app.route('/admin/withdrawals')
def admin_withdrawals():
    return render_template('admin-withdrawals.html', title="Withdrawal Requests")

# --- New Affiliate-Specific Routes ---
@app.route('/affiliate/dashboard')
def affiliate_dashboard():
    return render_template('affiliate-dashboard.html', title="Affiliate Dashboard")

@app.route('/affiliate/withdraw')
def affiliate_withdraw():
    return render_template('affiliate-withdraw.html', title="Withdraw Funds")

@app.route('/affiliate/orders')
def affiliate_orders():
    return render_template('affiliate-orders.html', title="My Affiliate Orders")

# ... (আপনার বাকি কোড) ...

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
