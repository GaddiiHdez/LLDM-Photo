package com.bereasnap.app;

import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Plugin nativo que recibe imágenes compartidas desde la Galería u otras apps de Android
 * mediante ACTION_SEND / ACTION_SEND_MULTIPLE y las copia al caché local para importarlas en BereaSnap.
 */
@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {

    private static final String SHARED_CACHE_DIR = "bereasnap_shared";
    private final List<JSObject> pendingItems = new ArrayList<>();
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private int activeCopyTasks = 0;

    @Override
    public void load() {
        Intent intent = getActivity() != null ? getActivity().getIntent() : null;
        if (intent != null) {
            processShareIntent(intent, false);
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (intent != null) {
            processShareIntent(intent, true);
        }
    }

    private void processShareIntent(Intent intent, boolean emitEventIfListening) {
        String action = intent.getAction();
        String type = intent.getType();

        if (action == null || type == null || !type.startsWith("image/")) {
            return;
        }
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            return;
        }

        List<Uri> uris = extractUrisFromIntent(intent, action);
        if (uris.isEmpty()) {
            return;
        }

        // Limpiar extras para evitar re-importación al rotar pantalla o recrear actividad
        intent.setAction(Intent.ACTION_MAIN);
        intent.removeExtra(Intent.EXTRA_STREAM);
        intent.setClipData(null);

        synchronized (pendingItems) {
            activeCopyTasks++;
        }

        executor.execute(() -> {
            List<JSObject> copied = new ArrayList<>();
            File dir = new File(getContext().getCacheDir(), SHARED_CACHE_DIR);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            ContentResolver resolver = getContext().getContentResolver();
            for (int i = 0; i < uris.size(); i++) {
                Uri uri = uris.get(i);
                if (uri == null) continue;
                try {
                    JSObject item = copyUriToCache(resolver, uri, dir, i);
                    if (item != null) {
                        copied.add(item);
                    }
                } catch (Exception e) {
                    android.util.Log.w("ShareReceiver", "No se pudo leer URI compartida: " + uri, e);
                }
            }

            synchronized (pendingItems) {
                activeCopyTasks--;
                if (!copied.isEmpty()) {
                    if (emitEventIfListening && hasListeners("sharedImagesReceived")) {
                        JSArray arr = new JSArray();
                        for (JSObject obj : copied) {
                            arr.put(obj);
                        }
                        JSObject payload = new JSObject();
                        payload.put("items", arr);
                        notifyListeners("sharedImagesReceived", payload);
                    } else {
                        pendingItems.addAll(copied);
                    }
                }
                pendingItems.notifyAll();
            }
        });
    }

    @SuppressWarnings("deprecation")
    private List<Uri> extractUrisFromIntent(Intent intent, String action) {
        List<Uri> uris = new ArrayList<>();

        if (Intent.ACTION_SEND.equals(action)) {
            Uri single = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                ? intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class)
                : intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (single != null) {
                uris.add(single);
            }
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Uri> multi = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                ? intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri.class)
                : intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (multi != null) {
                uris.addAll(multi);
            }
        }

        if (uris.isEmpty() && intent.getClipData() != null) {
            ClipData clip = intent.getClipData();
            for (int i = 0; i < clip.getItemCount(); i++) {
                Uri clipUri = clip.getItemAt(i).getUri();
                if (clipUri != null) {
                    uris.add(clipUri);
                }
            }
        }
        return uris;
    }

    private JSObject copyUriToCache(ContentResolver resolver, Uri uri, File dir, int index) throws Exception {
        String mimeType = resolver.getType(uri);
        if (mimeType == null || !mimeType.startsWith("image/")) {
            mimeType = "image/jpeg";
        }

        String displayName = queryDisplayName(resolver, uri);
        if (displayName == null || displayName.trim().isEmpty()) {
            displayName = "compartida_" + System.currentTimeMillis() + "_" + index + ".jpg";
        }

        String safeFileName = System.currentTimeMillis() + "_" + index + "_" +
            displayName.replaceAll("[^a-zA-Z0-9._-]", "_");
        File outFile = new File(dir, safeFileName);

        try (InputStream in = resolver.openInputStream(uri);
             FileOutputStream out = new FileOutputStream(outFile)) {
            if (in == null) return null;
            byte[] buffer = new byte[16384];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            out.flush();
        }

        JSObject item = new JSObject();
        item.put("path", outFile.getAbsolutePath());
        item.put("name", displayName);
        item.put("mimeType", mimeType);
        return item;
    }

    private String queryDisplayName(ContentResolver resolver, Uri uri) {
        try (Cursor cursor = resolver.query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) {
                    return cursor.getString(idx);
                }
            }
        } catch (Exception ignored) {
        }
        return uri.getLastPathSegment();
    }

    @PluginMethod
    public void consumePendingSharedImages(PluginCall call) {
        executor.execute(() -> {
            JSArray arr = new JSArray();
            synchronized (pendingItems) {
                while (activeCopyTasks > 0) {
                    try {
                        pendingItems.wait(3000);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
                for (JSObject obj : pendingItems) {
                    arr.put(obj);
                }
                pendingItems.clear();
            }
            JSObject result = new JSObject();
            result.put("items", arr);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void clearSharedCache(PluginCall call) {
        executor.execute(() -> {
            File dir = new File(getContext().getCacheDir(), SHARED_CACHE_DIR);
            if (dir.exists()) {
                File[] files = dir.listFiles();
                if (files != null) {
                    for (File f : files) {
                        f.delete();
                    }
                }
            }
            call.resolve();
        });
    }
}
