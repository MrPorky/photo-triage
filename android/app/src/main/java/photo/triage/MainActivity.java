package photo.triage;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import photo.triage.plugins.StorageAccessPlugin;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StorageAccessPlugin.class);
        super.onCreate(savedInstanceState);
        Log.d("MainActivity", "onCreate completed");
    }
}
