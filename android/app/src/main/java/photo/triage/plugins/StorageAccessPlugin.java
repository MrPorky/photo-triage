package photo.triage.plugins;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import androidx.activity.result.ActivityResult;

@CapacitorPlugin(
    name = "StorageAccess",
    permissions = {
        @Permission(
            strings = {
                Manifest.permission.MANAGE_EXTERNAL_STORAGE
            },
            alias = "storage"
        )
    }
)
public class StorageAccessPlugin extends Plugin {

    public StorageAccessPlugin() {
        super();
        android.util.Log.d("StorageAccess", "Plugin constructor called");
    }

    @Override
    public void load() {
        super.load();
        android.util.Log.d("StorageAccess", "Plugin load() called - plugin is ready!");
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject permissionsResult = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (Environment.isExternalStorageManager()) {
                permissionsResult.put("storage", "granted");
            } else {
                permissionsResult.put("storage", "denied");
            }
        } else {
            PermissionState state = getPermissionState("storage");
            permissionsResult.put("storage", state.toString());
        }
        call.resolve(permissionsResult);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (Environment.isExternalStorageManager()) {
                JSObject permissionsResult = new JSObject();
                permissionsResult.put("storage", "granted");
                call.resolve(permissionsResult);
            } else {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.addCategory("android.intent.category.DEFAULT");
                    intent.setData(Uri.parse(String.format("package:%s", getContext().getPackageName())));
                    startActivityForResult(call, intent, "manageStorageCallback");
                } catch (Exception e) {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                    startActivityForResult(call, intent, "manageStorageCallback");
                }
            }
        } else {
            requestPermissionForAlias("storage", call, "permissionsCallback");
        }
    }

    @ActivityCallback
    private void manageStorageCallback(PluginCall call, ActivityResult result) {
        JSObject permissionsResult = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (Environment.isExternalStorageManager()) {
                permissionsResult.put("storage", "granted");
            } else {
                permissionsResult.put("storage", "denied");
            }
        } else {
            permissionsResult.put("storage", "denied");
        }
        call.resolve(permissionsResult);
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        JSObject permissionsResult = new JSObject();
        PermissionState state = getPermissionState("storage");
        permissionsResult.put("storage", state.toString());
        call.resolve(permissionsResult);
    }
}
