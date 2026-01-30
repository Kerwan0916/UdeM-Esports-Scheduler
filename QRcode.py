import qrcode

# REPLACE with your actual domain when you deploy!
# For now, you can use your local IP to test (e.g., http://192.168.1.15:3000...)
#target_url = "https://www.udemesportsscheduler.com/signin?callbackUrl=https%3A%2F%2Fwww.udemesportsscheduler.com%2F"
target_url = "http://192.168.0.101:3000/api/scan/toggle"

qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H, # High error correction (good for printing)
    box_size=10,
    border=4,
)

qr.add_data(target_url)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white")
img.save("entry_qr.png")

print(f"QR Code generated for: {target_url}")