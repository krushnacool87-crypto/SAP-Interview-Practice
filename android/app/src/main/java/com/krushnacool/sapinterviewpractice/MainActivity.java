package com.krushnacool.sapinterviewpractice;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

public class MainActivity extends Activity {
    private WebView webView;

    private final class AppShareBridge {
        @JavascriptInterface
        public void shareApplication() {
            runOnUiThread(() -> {
                if (webView.getUrl() != null && webView.getUrl().startsWith("file:///android_asset/")) {
                    shareApplicationApk();
                }
            });
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(25, 118, 210));

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        webView.addJavascriptInterface(new AppShareBridge(), "AndroidApp");
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void shareApplicationApk() {
        File sharedDirectory = new File(getCacheDir(), "shared");
        File sharedApk = new File(sharedDirectory, "SAP-Interview-Practice.apk");

        try {
            if (!sharedDirectory.exists() && !sharedDirectory.mkdirs()) {
                throw new IOException("Could not create the APK sharing directory.");
            }

            try (FileInputStream input = new FileInputStream(getApplicationInfo().sourceDir);
                 FileOutputStream output = new FileOutputStream(sharedApk)) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = input.read(buffer)) != -1) {
                    output.write(buffer, 0, bytesRead);
                }
            }

            Uri apkUri = FileProvider.getUriForFile(
                this,
                getPackageName() + ".fileprovider",
                sharedApk
            );
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("application/vnd.android.package-archive");
            shareIntent.putExtra(Intent.EXTRA_STREAM, apkUri);
            shareIntent.putExtra(Intent.EXTRA_TEXT, "SAP Interview Practice app (APK).");
            shareIntent.setClipData(ClipData.newUri(getContentResolver(), "SAP Interview Practice APK", apkUri));
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(shareIntent, "Share SAP Interview Practice"));
        } catch (IOException | IllegalArgumentException error) {
            android.util.Log.e("SAPInterviewPractice", "Could not prepare the app for sharing", error);
            Toast.makeText(this, "Could not prepare the app for sharing.", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
