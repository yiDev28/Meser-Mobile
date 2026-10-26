package com.meser.mobile;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(NetworkInfoPlugin.class);
    registerPlugin(InsetsPlugin.class);
    registerPlugin(NotificationTapPlugin.class);
    super.onCreate(savedInstanceState);
    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView != null) {
      webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
      webView.getSettings().setBlockNetworkImage(false);
    }
  }
}