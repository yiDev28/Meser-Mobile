package com.meser.mobile;

import android.app.Activity;
import android.graphics.Insets;
import android.os.Build;
import android.view.View;
import android.view.WindowInsets;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Insets")
public class InsetsPlugin extends Plugin {

    @PluginMethod
    public void getInsets(PluginCall call) {
        JSObject out = new JSObject();
        out.put("left", 0);
        out.put("top", 0);
        out.put("right", 0);
        out.put("bottom", 0);

        Activity activity = getActivity();
        if (activity == null) {
            call.resolve(out);
            return;
        }

        View decor = activity.getWindow().getDecorView();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && decor != null) {
            WindowInsets wi = decor.getRootWindowInsets();
            if (wi != null) {
                Insets bars = wi.getInsets(WindowInsets.Type.systemBars());
                out.put("left", bars.left);
                out.put("top", bars.top);
                out.put("right", bars.right);
                out.put("bottom", bars.bottom);
                call.resolve(out);
                return;
            }
        }

        out.put("top", resourceDimension(activity, "status_bar_height"));
        out.put("bottom", resourceDimension(activity, "navigation_bar_height"));
        call.resolve(out);
    }

    private int resourceDimension(Activity activity, String name) {
        try {
            int id = activity.getResources().getIdentifier(name, "dimen", "android");
            if (id > 0) {
                return activity.getResources().getDimensionPixelSize(id);
            }
        } catch (Exception ignored) {
        }
        return 0;
    }
}