package com.mamacoin

import android.annotation.SuppressLint
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.webkit.*
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    // Основной URL — грузим с сервера
    private val REMOTE_URL = "https://mama-coin.ct.ws"
    // Fallback — локальные assets если нет сети
    private val LOCAL_URL  = "file:///android_asset/web/index.html"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)

        webView.settings.apply {
            javaScriptEnabled        = true
            domStorageEnabled        = true
            allowFileAccess          = true
            allowContentAccess       = true
            databaseEnabled          = true
            mixedContentMode         = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode                = WebSettings.LOAD_DEFAULT
            setSupportZoom(false)
            builtInZoomControls      = false
            displayZoomControls      = false
            // Разрешаем fetch/XHR к внешним URL из любого origin
            allowUniversalAccessFromFileURLs = true
            allowFileAccessFromFileURLs      = true
        }

        webView.addJavascriptInterface(AndroidBridge(), "MamaCoinAndroid")

        webView.webViewClient = object : WebViewClient() {

            override fun onPageFinished(view: WebView?, url: String?) {
                // Передаём FCM токен
                FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                    webView.evaluateJavascript(
                        "if(window.MamaCoinApp) window.MamaCoinApp.onFcmToken('${token}');",
                        null
                    )
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                // Если упал основной фрейм удалённого URL — грузим локальный fallback
                if (request?.isForMainFrame == true && request.url.toString().startsWith("https://mama-coin.ct.ws")) {
                    view?.loadUrl(LOCAL_URL)
                }
            }
        }

        webView.webChromeClient = WebChromeClient()

        // Грузим с сервера (там всегда актуальная версия)
        // Если нет сети — из assets
        if (isOnline()) {
            webView.loadUrl(REMOTE_URL)
        } else {
            webView.loadUrl(LOCAL_URL)
        }
    }

    private fun isOnline(): Boolean {
        val cm = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val cap = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
        return cap.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
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
