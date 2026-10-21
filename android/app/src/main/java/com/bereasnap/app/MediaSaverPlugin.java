package com.bereasnap.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Plugin nativo que guarda fotos JPG directamente en la Galería de Android
 * (carpeta Pictures/BereaSnap) usando MediaStore, sin pasar por ZIP ni por el menú de compartir.
 */
@CapacitorPlugin(name = "MediaSaver")
public class MediaSaverPlugin extends Plugin {

    @PluginMethod
    public void saveImage(PluginCall call) {
        String data = call.getString("data");
        String fileName = call.getString("fileName");
        String album = call.getString("album", "BereaSnap");

        if (data == null || fileName == null) {
            call.reject("Faltan parametros: data y fileName");
            return;
        }

        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            ContentResolver resolver = getContext().getContentResolver();
            Uri resultUri;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + album);
                values.put(MediaStore.Images.Media.IS_PENDING, 1);

                Uri collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                resultUri = resolver.insert(collection, values);
                if (resultUri == null) {
                    call.reject("No se pudo crear el archivo en la Galeria");
                    return;
                }

                try (OutputStream out = resolver.openOutputStream(resultUri)) {
                    if (out == null) {
                        throw new Exception("No se pudo abrir el flujo de escritura");
                    }
                    out.write(bytes);
                    out.flush();
                }

                ContentValues done = new ContentValues();
                done.put(MediaStore.Images.Media.IS_PENDING, 0);
                resolver.update(resultUri, done, null, null);
            } else {
                // Android 7 a 9: escritura directa en Pictures (requiere permiso WRITE_EXTERNAL_STORAGE)
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), album);
                if (!dir.exists() && !dir.mkdirs()) {
                    call.reject("No se pudo crear la carpeta de la Galeria");
                    return;
                }
                File file = new File(dir, fileName);
                try (FileOutputStream out = new FileOutputStream(file)) {
                    out.write(bytes);
                    out.flush();
                }

                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DATA, file.getAbsolutePath());
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                resultUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            }

            JSObject ret = new JSObject();
            ret.put("uri", resultUri != null ? resultUri.toString() : "");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error guardando imagen: " + e.getMessage(), e);
        }
    }
}
