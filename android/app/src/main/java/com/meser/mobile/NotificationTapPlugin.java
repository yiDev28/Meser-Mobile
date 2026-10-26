package com.meser.mobile;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * El plugin oficial de LocalNotifications solo reporta el toque en la
 * notificacion cuando la app ya esta corriendo (handleOnNewIntent).
 * Este plugin cubre el arranque en frio: la app fue cerrada por Android y el
 * usuario toca la notificacion, el Intent de arranque trae los datos.
 */
@CapacitorPlugin(name = "NotificationTap")
public class NotificationTapPlugin extends Plugin {

    private static final String KEY_ID = "LocalNotificationId";
    private static final String KEY_OBJECT = "LocalNotficationObject";
    private static final String KEY_ACTION = "LocalNotificationUserAction";

    @Override
    public void load() {
        emitFromIntent(getActivity().getIntent());
    }

    @PluginMethod
    public void consume(PluginCall call) {
        emitFromIntent(getActivity().getIntent());
        call.resolve();
    }

    private void emitFromIntent(Intent intent) {
        if (intent == null || !intent.hasExtra(KEY_ID)) {
            return;
        }
        String json = intent.getStringExtra(KEY_OBJECT);
        String action = intent.getStringExtra(KEY_ACTION);
        intent.removeExtra(KEY_ID);
        intent.removeExtra(KEY_OBJECT);
        intent.removeExtra(KEY_ACTION);
        if (json == null) {
            return;
        }
        try {
            JSONObject obj = new JSONObject(json);
            JSObject data = new JSObject(obj.toString());
            data.put("actionId", action == null ? "tap" : action);
            notifyListeners("notificationTapped", data, true);
        } catch (JSONException ignored) {
            // el intent no traia la notificacion
        }
    }
}
