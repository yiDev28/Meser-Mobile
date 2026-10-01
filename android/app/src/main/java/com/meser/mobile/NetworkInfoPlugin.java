package com.meser.mobile;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.Inet4Address;
import java.net.InetAddress;

@CapacitorPlugin(name = "NetworkInfo")
public class NetworkInfoPlugin extends Plugin {

    @PluginMethod
    public void getLocalIp(PluginCall call) {
        ConnectivityManager cm = (ConnectivityManager) getContext()
                .getSystemService(Context.CONNECTIVITY_SERVICE);
        String bestIp = null;
        int bestPrefix = -1;

        if (cm != null) {
            Network network = cm.getActiveNetwork();
            LinkProperties lp = network != null ? cm.getLinkProperties(network) : null;
            if (lp != null) {
                for (LinkAddress addr : lp.getLinkAddresses()) {
                    InetAddress ip = addr.getAddress();
                    if (ip instanceof Inet4Address && !ip.isLoopbackAddress()) {
                        int prefix = addr.getPrefixLength();
                        if (prefix > bestPrefix) {
                            bestPrefix = prefix;
                            bestIp = ip.getHostAddress();
                        }
                    }
                }
            }
        }

        if (bestIp == null || bestPrefix < 0) {
            call.resolve(new JSObject().put("available", false));
            return;
        }

        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("ip", bestIp);
        ret.put("prefixLength", bestPrefix);
        call.resolve(ret);
    }
}