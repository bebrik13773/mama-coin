package com.mamacoin

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.*
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)

        webView.settings.apply {
            javaScriptEnabled       = true
            domStorageEnabled       = true       // нужно для localStorage
            allowFileAccess         = true
            allowContentAccess      = true
            databaseEnabled         = true
            mixedContentMode        = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode               = WebSettings.LOAD_DEFAULT
            setSupportZoom(false)
            builtInZoomControls     = false
            displayZoomControls     = false
        }

        // Android → JS мост
        webView.addJavascriptInterface(AndroidBridge(), "MamaCoinAndroid")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                // Передаём FCM токен в веб-приложение
                FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                    webView.evaluateJavascript(
                        "if(window.MamaCoinApp) window.MamaCoinApp.onFcmToken('$token');",
                        null
                    )
                }
            }
        }

        webView.webChromeClient = WebChromeClient()

        // Загружаем веб-приложение
        // В DEBUG — загружаем с assets; в продакшене можно грузить с сервера
        webView.loadUrl("file:///android_asset/web/index.html")
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            webView.evaluateJavascript("document.dispatchEvent(new Event('backbutton'));", null)
        }
    }

    inner class AndroidBridge {
        @JavascriptInterface
        fun getFcmToken(): String {
            var result = ""
            FirebaseMessaging.getInstance().token.addOnSuccessListener { result = it }
            return result
        }

        @JavascriptInterface
        fun vibrate() {
            val v = getSystemService(VIBRATOR_SERVICE) as android.os.Vibrator
            @Suppress("DEPRECATION")
            v.vibrate(50)
        }

        @JavascriptInterface
        fun showNativeToast(msg: String) {
            runOnUiThread { Toast.makeText(this@MainActivity, msg, Toast.LENGTH_SHORT).show() }
        }
    }
}
