package com.bereasnap.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Plugin nativo para BereaSnap que descarga e inicia la instalación
 * del paquete APK directamente dentro de la aplicación, sin abrir el navegador.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String DEFAULT_APK_NAME = "BereaSnap-update.apk";

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String apkUrl = call.getString("url");
        String apkName = call.getString("fileName", DEFAULT_APK_NAME);

        if (apkUrl == null || apkUrl.isEmpty()) {
            call.reject("Falta la URL de descarga del APK");
            return;
        }

        new Thread(() -> {
            HttpURLConnection connection = null;
            InputStream input = null;
            FileOutputStream output = null;

            try {
                String targetUrl = apkUrl;
                int redirects = 0;

                // Seguir redirecciones HTTP (GitHub Releases redirige a AWS S3)
                while (redirects < 6) {
                    URL url = new URL(targetUrl);
                    connection = (HttpURLConnection) url.openConnection();
                    connection.setInstanceFollowRedirects(true);
                    connection.setRequestProperty("User-Agent", "BereaSnap-Android-App");
                    connection.setConnectTimeout(15000);
                    connection.setReadTimeout(30000);
                    connection.connect();

                    int code = connection.getResponseCode();
                    if (code == HttpURLConnection.HTTP_MOVED_PERM ||
                        code == HttpURLConnection.HTTP_MOVED_TEMP ||
                        code == 307 || code == 308) {
                        String newLocation = connection.getHeaderField("Location");
                        connection.disconnect();
                        if (newLocation != null && !newLocation.isEmpty()) {
                            targetUrl = newLocation;
                            redirects++;
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }

                if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    call.reject("Error del servidor: HTTP " + connection.getResponseCode());
                    return;
                }

                long fileLength = connection.getContentLengthLong();

                Context context = getContext();
                File cacheDir = context.getExternalCacheDir();
                if (cacheDir == null) {
                    cacheDir = context.getCacheDir();
                }

                File apkFile = new File(cacheDir, apkName);
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                input = connection.getInputStream();
                output = new FileOutputStream(apkFile);

                byte[] data = new byte[8192];
                long total = 0;
                int count;
                long lastNotifyTime = 0;
                int lastPercent = -1;

                while ((count = input.read(data)) != -1) {
                    total += count;
                    output.write(data, 0, count);

                    int percent = fileLength > 0 ? (int) ((total * 100) / fileLength) : 0;
                    long now = System.currentTimeMillis();

                    if (now - lastNotifyTime > 120 || percent != lastPercent) {
                        lastNotifyTime = now;
                        lastPercent = percent;

                        JSObject progress = new JSObject();
                        progress.put("percent", percent);
                        progress.put("bytesDownloaded", total);
                        progress.put("totalBytes", fileLength);
                        notifyListeners("downloadProgress", progress);
                    }
                }

                output.flush();

                // Notificar 100% completado
                JSObject finalProgress = new JSObject();
                finalProgress.put("percent", 100);
                finalProgress.put("bytesDownloaded", total);
                finalProgress.put("totalBytes", fileLength);
                notifyListeners("downloadProgress", finalProgress);

                // Iniciar instalación mediante FileProvider e Intent del sistema
                launchInstaller(apkFile);

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("path", apkFile.getAbsolutePath());
                call.resolve(result);

            } catch (Exception e) {
                call.reject("Error descargando el APK: " + e.getMessage(), e);
            } finally {
                try {
                    if (output != null) output.close();
                    if (input != null) input.close();
                } catch (Exception ignored) {}
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    @PluginMethod
    public void installExisting(PluginCall call) {
        String apkName = call.getString("fileName", DEFAULT_APK_NAME);
        try {
            Context context = getContext();
            File cacheDir = context.getExternalCacheDir();
            if (cacheDir == null) {
                cacheDir = context.getCacheDir();
            }

            File apkFile = new File(cacheDir, apkName);
            if (!apkFile.exists()) {
                call.reject("El archivo APK descargado no existe.");
                return;
            }

            launchInstaller(apkFile);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error abriendo el instalador: " + e.getMessage(), e);
        }
    }

    private void launchInstaller(File apkFile) {
        Context context = getContext();
        Uri apkUri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            apkFile
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        // Si Android 8+ requiere permiso para instalar paquetes de fuentes desconocidas
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!context.getPackageManager().canRequestPackageInstalls()) {
                Intent permIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                permIntent.setData(Uri.parse("package:" + context.getPackageName()));
                permIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(permIntent);
            }
        }

        context.startActivity(intent);
    }
}
