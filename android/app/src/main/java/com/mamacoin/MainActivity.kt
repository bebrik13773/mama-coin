package com.mamacoin

import android.annotation.SuppressLint
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.view.View
import android.webkit.*
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var loadingView: View
    private lateinit var errorView: View
    private lateinit var progressBar: ProgressBar

    private val REMOTE_URL = "https://mama-coin.ct.ws/web"
    private val LOCAL_URL  = "file:///android_asset/web/index.html"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView     = findViewById(R.id.webview)
        loadingView = findViewById(R.id.loading_view)
        errorView   = findViewById(R.id.error_view)
        progressBar = findViewById(R.id.progress_bar)

        webView.settings.apply {
            javaScriptEnabled                    = true
            domStorageEnabled                    = true
            allowFileAccess                      = true
            allowContentAccess                   = true
            databaseEnabled                      = true
            mixedContentMode                     = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode                            = WebSettings.LOAD_DEFAULT
            setSupportZoom(false)
            builtInZoomControls                  = false
            displayZoomControls                  = false
            allowUniversalAccessFromFileURLs     = true
            allowFileAccessFromFileURLs          = true
        }

        webView.addJavascriptInterface(AndroidBridge(), "MamaCoinAndroid")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                showLoading()
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                // Показываем WebView и скрываем загрузку
                runOnUiThread {
                    webView.visibility     = View.VISIBLE
                    loadingView.visibility = View.GONE
                    errorView.visibility   = View.GONE
                }
                FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                    view?.evaluateJavascript(
                        "if(window.MamaCoinApp) window.MamaCoinApp.onFcmToken('$token');", null
                    )
                }
            }

            override fun onReceivedError(
                view: WebView?, request: WebResourceRequest?, error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true) {
                    hideLoading()
                    if (!isOnline()) {
                        showError("Нет подключения к интернету", true)
                    } else {
                        // Сервер недоступен — грузим локальную копию
                        view?.loadUrl(LOCAL_URL)
                    }
                }
            }

            override fun onReceivedHttpError(
                view: WebView?, request: WebResourceRequest?, errorResponse: WebResourceResponse?
            ) {
                if (request?.isForMainFrame == true && (errorResponse?.statusCode ?: 0) >= 500) {
                    hideLoading()
                    showError("Сервер временно недоступен\n(${errorResponse?.statusCode})", true)
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                progressBar.visibility = if (newProgress < 100) View.VISIBLE else View.GONE
            }
        }

        // Кнопка "Повторить" на экране ошибки
        findViewById<Button>(R.id.btn_retry).setOnClickListener { loadApp() }

        loadApp()
    }

    private fun loadApp() {
        errorView.visibility  = View.GONE
        loadingView.visibility = View.VISIBLE
        webView.visibility    = View.GONE
        if (isOnline()) webView.loadUrl(REMOTE_URL) else webView.loadUrl(LOCAL_URL)
    }

    private fun showLoading() {
        // Показываем индикатор только при первой загрузке (webview ещё не показан)
        if (webView.visibility != View.VISIBLE) {
            loadingView.visibility = View.VISIBLE
            errorView.visibility   = View.GONE
        }
    }

    private fun hideLoading() {
        loadingView.visibility = View.GONE
        webView.visibility     = View.VISIBLE
    }

    private fun showError(msg: String, showRetry: Boolean) {
        errorView.visibility   = View.VISIBLE
        webView.visibility     = View.GONE
        loadingView.visibility = View.GONE
        findViewById<TextView>(R.id.error_text).text = msg
        findViewById<Button>(R.id.btn_retry).visibility = if (showRetry) View.VISIBLE else View.GONE
    }

    private fun isOnline(): Boolean {
        val cm = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val cap = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
        return cap.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack()
        else webView.evaluateJavascript("document.dispatchEvent(new Event('backbutton'));", null)
    }

    inner class AndroidBridge {
        @JavascriptInterface fun vibrate() {
            @Suppress("DEPRECATION")
            (getSystemService(VIBRATOR_SERVICE) as android.os.Vibrator).vibrate(50)
        }
        @JavascriptInterface fun showNativeToast(msg: String) {
            runOnUiThread { Toast.makeText(this@MainActivity, msg, Toast.LENGTH_SHORT).show() }
        }
    }
}
