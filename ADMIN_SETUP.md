# Admin Dashboard Setup

This guide explains how to set up the admin dashboard for manually managing Bybit trades.

## 🔐 Environment Variables

Add this to your `.env.local` file:

```bash
# Admin Dashboard Password
ADMIN_PASSWORD=your_secure_admin_password_here
```

## 🚀 Features

The admin dashboard provides:

### 📊 **Signals Management**

- View all trading signals
- Close signals manually
- Delete signals
- Update signal status

### 📈 **Position Management**

- View current Bybit positions
- Close positions manually
- Real-time position data

### 🛠️ **Manual Actions**

- Add manual signals
- Refresh data
- Quick actions

## 🔒 Security

- **Password Protection**: Admin access requires the password set in `ADMIN_PASSWORD`
- **Session Management**: Password is validated on each request
- **Audit Trail**: All admin actions are logged

## 📱 Usage

1. **Access Admin Dashboard**: Navigate to `/admin`
2. **Enter Password**: Use the password from `ADMIN_PASSWORD`
3. **Manage Trades**: Use the tabs to manage signals and positions

## 🎯 Key Functions

### **Signals Tab**

- View all Bybit signals
- Close active signals
- Delete unwanted signals
- Update signal details

### **Positions Tab**

- View current Bybit positions
- Close positions manually
- See unrealized P&L

### **Manual Actions Tab**

- Add new signals manually
- Refresh all data
- Quick management tools

## ⚠️ Important Notes

- **Admin actions cannot be undone**
- **All actions are logged**
- **Use with caution in production**
- **Keep your admin password secure**

## 🔧 API Endpoints

The admin dashboard uses these API endpoints:

- `POST /api/admin/auth` - Admin authentication
- `GET /api/admin/positions` - Fetch current positions
- `POST /api/admin/close-position` - Close position manually
- `POST /api/admin/add-signal` - Add manual signal
- `POST /api/admin/update-signal` - Update signal
- `POST /api/admin/delete-signal` - Delete signal

## 🛡️ Security Best Practices

1. **Use a strong password** for `ADMIN_PASSWORD`
2. **Don't commit** the password to version control
3. **Rotate the password** regularly
4. **Monitor admin access** logs
5. **Limit admin access** to trusted users only

## 🚨 Emergency Procedures

If you need to quickly disable admin access:

1. **Remove the password** from environment variables
2. **Restart the application**
3. **Admin dashboard will be inaccessible**

## 📞 Support

If you encounter issues with the admin dashboard:

1. Check that `ADMIN_PASSWORD` is set correctly
2. Verify all environment variables are configured
3. Check the application logs for errors
4. Ensure the proxy API is accessible
