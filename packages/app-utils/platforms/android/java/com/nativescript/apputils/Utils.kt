package com.nativescript.apputils

import android.os.Build
import android.graphics.Rect
import android.util.TypedValue
import android.content.Context
import android.content.Intent
import android.content.res.Resources
import android.view.Window
import android.view.View
import androidx.core.view.ViewCompat
import android.view.WindowInsets
import androidx.core.view.WindowInsetsCompat
import androidx.appcompat.app.AppCompatActivity
import androidx.core.os.ConfigurationCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import com.google.android.material.color.DynamicColors
import java.util.Locale
import android.util.Log

class Utils {
    interface WindowInsetsCallback {
        fun onWindowInsetsChange(result: IntArray)
    }
    companion object {
        fun getColorFromName(context: Context, name: String?): Int {
            val resID = context.resources.getIdentifier(name, "attr", context.packageName)
            val array = context.theme.obtainStyledAttributes(intArrayOf(resID))
            return array.getColor(0, 0xFF00FF)
        }

        fun getColorFromInt(context: Context, resId: Int): Int {
            val array = context.theme.obtainStyledAttributes(intArrayOf(resId))
            return array.getColor(0, 0xFF00FF)
        }

        fun getDimensionFromInt(context: Context, resId: Int): Float {
            val array = context.theme.obtainStyledAttributes(intArrayOf(resId))
            return array.getDimension(0, 0f)
        }

        fun applyDayNight(activity: AppCompatActivity, applyDynamicColors: Boolean) {

            // we need to applyDayNight to update theme thus colors as we dont restart activity (configChanges:uiMode)
            // but then dynamic colors are lost so let s call DynamicColors.applyIfAvailable
            activity.getDelegate().applyDayNight()
            if (applyDynamicColors) {
                DynamicColors.applyIfAvailable(activity)
            }
        }

        fun applyDynamicColors(activity: AppCompatActivity?) {
            DynamicColors.applyIfAvailable(activity!!)
        }

        fun restartApp(ctx: Context, activity: AppCompatActivity?) {
            val pm = ctx.packageManager
            val intent = pm.getLaunchIntentForPackage(ctx.packageName)
            val mainIntent = Intent.makeRestartActivityTask(intent!!.component)
            ctx.startActivity(mainIntent)
            Runtime.getRuntime().exit(0)
        }

        val systemLocale: Locale?
            get() = ConfigurationCompat.getLocales(Resources.getSystem().configuration)[0]

        @JvmOverloads
        fun prepareActivity(activity: AppCompatActivity, applyDynamicColors: Boolean = true) {
            if (applyDynamicColors) {
                DynamicColors.applyToActivityIfAvailable(activity)
            }
            activity.installSplashScreen()
            prepareWindow(activity.window)
        }

        fun prepareWindow(window: Window?) {
            WindowCompat.setDecorFitsSystemWindows(window!!, false)
        }
        fun getRootWindowInsets(view: View): IntArray {
            val windowInsets = ViewCompat.getRootWindowInsets(view) ?: return intArrayOf(0, 0,0, 0, 0)
            val inset = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            val imeVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime())
            val imeHeight = if (imeVisible)  windowInsets.getInsets(WindowInsetsCompat.Type.ime()).bottom else 0
            return intArrayOf(inset.top, inset.bottom, inset.left, inset.right, imeHeight)
        }

        fun listenForWindowInsetsChange(rootView: View, callback: WindowInsetsCallback) {
            rootView.setOnApplyWindowInsetsListener{ view, insets -> 
                val inset = getRootWindowInsets(view)
                callback.onWindowInsetsChange(inset)
                return@setOnApplyWindowInsetsListener insets
            }
            if (Build.VERSION.SDK_INT  < Build.VERSION_CODES.R) {
                var alreadyOpen = false
                val defaultKeyboardHeightDP = 100
                val estimatedKeyboardDP = defaultKeyboardHeightDP + if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) 48 else 0
                val rect = Rect()
                rootView.viewTreeObserver.addOnGlobalLayoutListener {
                    val estimatedKeyboardHeight = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, estimatedKeyboardDP.toFloat(), rootView.resources.displayMetrics).toInt()
                    rootView.getWindowVisibleDisplayFrame(rect)
                    val heightDiff = rootView.rootView.height - (rect.bottom - rect.top)
                    val isShown = heightDiff >= estimatedKeyboardHeight

                    if (isShown !== alreadyOpen) {
                        alreadyOpen = isShown
                        rootView.requestApplyInsets()
                    }
                }

            }
        }

        fun guessMimeType(context: Context, uri: android.net.Uri): String? {
            val type = android.webkit.MimeTypeMap.getSingleton().getExtensionFromMimeType(context.getContentResolver().getType(uri));
            if (type != null) {
                return android.webkit.MimeTypeMap.getSingleton().getMimeTypeFromExtension(type);
            }
            return null
        }
    }
}