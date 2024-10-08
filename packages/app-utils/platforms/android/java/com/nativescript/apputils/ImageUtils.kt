package com.nativescript.apputils

import android.content.ContentResolver
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.exifinterface.media.ExifInterface
import org.json.JSONException
import org.json.JSONObject
import java.io.FileDescriptor
import java.io.FileNotFoundException
import java.io.IOException
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.concurrent.thread

import com.nativescript.apputils.FunctionCallback

/**
 * This class contains helper functions for processing images
 *
 * @constructor creates image util
 */
class ImageUtils {

    class LoadImageOptions {
        var options: JSONObject? = null
        var sourceWidth = 0
        var sourceHeight = 0
        var width = 0
        var maxWidth = 0
        var height = 0
        var maxHeight = 0
        var keepAspectRatio = true
        var autoScaleFactor = true

        fun initWithJSON(jsonOpts: JSONObject)
        {
            options = jsonOpts
            if (jsonOpts.has("resizeThreshold")) {
                maxWidth = jsonOpts.optInt("resizeThreshold", maxWidth)
                maxHeight = maxWidth
            } else if (jsonOpts.has("maxSize")) {
                maxWidth = jsonOpts.optInt("maxSize", maxWidth)
                maxHeight = maxWidth
            }
            if (jsonOpts.has("width")) {
                width = jsonOpts.optInt("width", width)
            } else if (jsonOpts.has("maxWidth")) {
                maxWidth = jsonOpts.optInt("maxWidth", maxWidth)
            }
            if (jsonOpts.has("height")) {
                height = jsonOpts.optInt("height", height)
            } else if (jsonOpts.has("maxHeight")) {
                maxHeight = jsonOpts.optInt("maxHeight", maxHeight)
            }
            sourceWidth = jsonOpts.optInt("sourceWidth", sourceWidth)
            sourceHeight = jsonOpts.optInt("sourceHeight", sourceHeight)
            keepAspectRatio = jsonOpts.optBoolean("keepAspectRatio", keepAspectRatio)
            autoScaleFactor = jsonOpts.optBoolean("autoScaleFactor", autoScaleFactor)

        }
        constructor(options: String?) {
            if (options != null) {
                try {
                    val jsonOpts = JSONObject(options)
                    initWithJSON(jsonOpts)
                } catch (ignored: JSONException) {
                }
            }
        }
        constructor(jsonOpts: JSONObject) {
            initWithJSON(jsonOpts)
        }

        var resizeThreshold = 0
            get() { return min(maxWidth, maxHeight)}


    }

    class ImageAssetOptions {
        var width = 0
        var height = 0
        var keepAspectRatio = true
        var autoScaleFactor = true

        constructor(sourceSize: Pair<Int, Int>) {
            width = sourceSize.first
            height = sourceSize.second
        }
        constructor(sourceSize: Pair<Int, Int>, options: LoadImageOptions?) {
            width = sourceSize.first
            height = sourceSize.second
            if (options != null) {
                if (options.width > 0) {
                    width = options.width
                }
                if (options.height > 0) {
                    height = options.height
                }
                if (options.maxWidth > 0) {
                    width = min(
                        width,
                        options.maxWidth
                    )
                }
                if (options.maxHeight > 0) {
                    height = min(
                        height,
                        options.maxHeight
                    )
                }
                keepAspectRatio = options.keepAspectRatio
                autoScaleFactor = options.autoScaleFactor
            }
        }
    }
    companion object {
        fun getTargetFormat(format: String?): Bitmap.CompressFormat {
            return when (format) {
                "jpeg", "jpg" -> Bitmap.CompressFormat.JPEG
                else -> Bitmap.CompressFormat.PNG
            }
        }
        /**
         * Calculate an inSampleSize for use in a [BitmapFactory.Options] object when decoding
         * bitmaps using the decode* methods from [BitmapFactory]. This implementation calculates
         * the closest inSampleSize that is a power of 2 and will result in the final decoded bitmap
         * having a width and height equal to or larger than the requested width and height.
         *
         * @param imageWidth  The original width of the resulting bitmap
         * @param imageHeight The original height of the resulting bitmap
         * @param reqWidth    The requested width of the resulting bitmap
         * @param reqHeight   The requested height of the resulting bitmap
         * @return The value to be used for inSampleSize
         */
        fun calculateInSampleSize(
            imageWidth: Int,
            imageHeight: Int,
            reqWidth: Int,
            reqHeight: Int
        ): Int {
            // BEGIN_INCLUDE (calculate_sample_size)
            // Raw height and width of image
            var reqWidth = reqWidth
            var reqHeight = reqHeight
            reqWidth = if (reqWidth > 0) reqWidth else imageWidth
            reqHeight = if (reqHeight > 0) reqHeight else imageHeight
            var inSampleSize = 1
            if (imageHeight > reqHeight || imageWidth > reqWidth) {
                val halfHeight = imageHeight / 2
                val halfWidth = imageWidth / 2

                // Calculate the largest inSampleSize value that is a power of 2 and keeps both
                // height and width larger than the requested height and width.
                while (halfHeight / inSampleSize > reqHeight && halfWidth / inSampleSize > reqWidth) {
                    inSampleSize *= 2
                }

                // This offers some additional logic in case the image has a strange
                // aspect ratio. For example, a panorama may have a much larger
                // width than height. In these cases the total pixels might still
                // end up being too large to fit comfortably in memory, so we should
                // be more aggressive with sample down the image (=larger inSampleSize).
                var totalPixels =
                    (imageWidth / inSampleSize * (imageHeight / inSampleSize)).toLong()

                // Anything more than 2x the requested pixels we'll sample down further
                val totalReqPixelsCap = (reqWidth * reqHeight * 2).toLong()
                while (totalPixels > totalReqPixelsCap) {
                    inSampleSize *= 2
                    totalPixels =
                        (imageWidth / inSampleSize * (imageHeight / inSampleSize)).toLong()
                }
            }
            return inSampleSize
            // END_INCLUDE (calculate_sample_size)
        }

        private fun getAspectSafeDimensions(
            sourceWidth: Int,
            sourceHeight: Int,
            reqWidth: Int,
            reqHeight: Int
        ): Pair<Int, Int> {
            val widthCoef = sourceWidth.toDouble() / reqWidth.toDouble()
            val heightCoef = sourceHeight.toDouble() / reqHeight.toDouble()
            val imageRatio = sourceWidth.toDouble() / sourceHeight.toDouble()
//            val aspectCoef = max(widthCoef, heightCoef)
            if (widthCoef > heightCoef) {
                return Pair(reqWidth, (reqWidth/imageRatio).toInt())
            } else {
                return Pair((reqHeight*imageRatio).toInt(), reqHeight)

            }
//            return Pair(
//                ((sourceWidth / aspectCoef)).toInt(),
//                ((sourceHeight / aspectCoef)).toInt()
//            )
        }
        private fun getRequestedImageSize(
            src: Pair<Int, Int>,
            options: ImageAssetOptions
        ): Pair<Int, Int> {
            var reqWidth = options.width
            if (reqWidth <= 0) {
                reqWidth = src.first
            }
            var reqHeight = options.height
            if (reqHeight <= 0) {
                reqHeight = src.second
            }
            if (options.keepAspectRatio) {
                val (first, second) = getAspectSafeDimensions(
                    src.first,
                    src.second,
                    reqWidth,
                    reqHeight
                )
                reqWidth = first
                reqHeight = second
            }
            return Pair(reqWidth, reqHeight)
        }

        private fun closePfd(pfd: ParcelFileDescriptor?) {
            if (pfd != null) {
                try {
                    pfd.close()
                } catch (ignored: IOException) {
                }
            }
        }

        private fun calculateAngleFromFile(filename: String): Int {
            var rotationAngle = 0
            val ei: ExifInterface
            try {
                ei = ExifInterface(filename)
                val orientation = ei.getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL
                )
                when (orientation) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> rotationAngle = 90
                    ExifInterface.ORIENTATION_ROTATE_180 -> rotationAngle = 180
                    ExifInterface.ORIENTATION_ROTATE_270 -> rotationAngle = 270
                }
            } catch (ignored: IOException) {
            }
            return rotationAngle
        }


        private fun calculateAngleFromFileDescriptor(fd: FileDescriptor): Int {
            var rotationAngle = 0
            val ei: ExifInterface
            try {
                ei = ExifInterface(fd)
                val orientation = ei.getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL
                )
                when (orientation) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> rotationAngle = 90
                    ExifInterface.ORIENTATION_ROTATE_180 -> rotationAngle = 180
                    ExifInterface.ORIENTATION_ROTATE_270 -> rotationAngle = 270
                }
            } catch (ignored: IOException) {
            }
            return rotationAngle
        }
        fun getImageSize(context: Context, src: String): IntArray {
            val bitmapOptions = BitmapFactory.Options()
            bitmapOptions.inJustDecodeBounds = true
            var pfd: ParcelFileDescriptor? = null
            if (src.startsWith("content://")) {
                val uri = Uri.parse(src)
                val resolver: ContentResolver = context.getContentResolver()
                pfd = try {
                    resolver.openFileDescriptor(uri, "r")
                } catch (e: FileNotFoundException) {
                    closePfd(pfd)
                    throw e;
                }
                BitmapFactory.decodeFileDescriptor(pfd!!.fileDescriptor, null, bitmapOptions)
            } else {
                BitmapFactory.decodeFile(src, bitmapOptions)
            }
            val rotationAngle: Int
            if (pfd != null) {
                rotationAngle = calculateAngleFromFileDescriptor(pfd.fileDescriptor)
                closePfd(pfd)
            } else {
                rotationAngle = calculateAngleFromFile(src)
            }
            return intArrayOf(bitmapOptions.outWidth, bitmapOptions.outHeight, rotationAngle)
        }

        fun readBitmapFromFileSync(context: Context, src: String, options: LoadImageOptions?, sourceSize:Pair<Int, Int>?): Bitmap? {
            //  val start = System.currentTimeMillis()
            var sourceSize = sourceSize
            if (sourceSize == null && options?.sourceWidth != 0 && options?.sourceHeight != 0) {
                sourceSize = Pair(options!!.sourceWidth, options!!.sourceHeight)
            }
            var bitmap: Bitmap?
            val bitmapOptions = BitmapFactory.Options()
            var pfd: ParcelFileDescriptor? = null
            if (src.startsWith("content://")) {
                val uri = Uri.parse(src)
                val resolver: ContentResolver = context.getContentResolver()
                pfd = try {
                    resolver.openFileDescriptor(uri, "r")
                } catch (e: FileNotFoundException) {
                    closePfd(pfd)
                    throw e;
                }
            }
            if (sourceSize == null) {
                bitmapOptions.inJustDecodeBounds = true

                if (pfd != null) {
                    BitmapFactory.decodeFileDescriptor(pfd!!.fileDescriptor, null, bitmapOptions)
                } else {
                    BitmapFactory.decodeFile(src, bitmapOptions)
                }
                sourceSize = Pair(bitmapOptions.outWidth, bitmapOptions.outHeight)
            }
            val opts = ImageAssetOptions(sourceSize, options)

            val (first, second) = getRequestedImageSize(sourceSize, opts)
            val sampleSize: Int = calculateInSampleSize(
                sourceSize.first, sourceSize.second,
                first,
                second
            )
            val finalBitmapOptions = BitmapFactory.Options()
            finalBitmapOptions.inSampleSize = sampleSize
            if (sampleSize != 1) {
                finalBitmapOptions.inScaled = true;
                finalBitmapOptions.inDensity = sourceSize.first;
                finalBitmapOptions.inTargetDensity =  first * sampleSize;
            } else {
                finalBitmapOptions.inScaled = false;
            }
            // read as minimum bitmap as possible (slightly bigger than the requested size)
            bitmap = if (pfd != null) {
                BitmapFactory.decodeFileDescriptor(pfd.fileDescriptor, null, finalBitmapOptions)
            } else {
                BitmapFactory.decodeFile(src, finalBitmapOptions)
            }
            // Log.d("ImageAnalysis", "readBitmapFromFile in ${System.currentTimeMillis() - start} ms")
            if (bitmap != null) {
                val rotationAngle: Int
                if (pfd != null) {
                    rotationAngle = calculateAngleFromFileDescriptor(pfd.fileDescriptor)
                    closePfd(pfd)
                } else {
                    rotationAngle = calculateAngleFromFile(src)
                }
//                if (first !== bitmap.getWidth() || second !== bitmap.getHeight()  || rotationAngle != 0) {
//
//                    val matrix = Matrix()
//                    if (first !== bitmap.getWidth() || second !== bitmap.getHeight()) {
//                        val scale = first.toFloat() / bitmap.width
//                        matrix.postScale(scale, scale)
//                    }
//                    if (rotationAngle != 0) {
//                        matrix.postRotate(rotationAngle.toFloat())
//                    }
//                    bitmap = Bitmap.createBitmap(
//                        bitmap,
//                        0,
//                        0,
//                        bitmap.getWidth(),
//                        bitmap.getHeight(),
//                        matrix,
//                        false
//                    )
//                }

                if (rotationAngle != 0) {
                    val matrix = Matrix()
                    matrix.postRotate(rotationAngle.toFloat())
                    bitmap = Bitmap.createBitmap(
                        bitmap,
                        0,
                        0,
                        bitmap.getWidth(),
                        bitmap.getHeight(),
                        matrix,
                        true
                    )
                }
                // Log.d("ImageAnalysis", "readBitmapFromFile2 in ${System.currentTimeMillis() - start} ms")
            }
            return bitmap
        }

        fun readBitmapFromFileSync(context: Context, src: String, opts: String?): Bitmap? {
            return readBitmapFromFileSync(context, src, LoadImageOptions(opts), null)
        }
        fun readBitmapFromFile(context: Context, src: String, callback: FunctionCallback, opts: String?) {
            thread(start = true) {
                try {
                    callback.onResult(null, readBitmapFromFileSync(context, src, opts))
                } catch (e: Exception) {
                    callback.onResult(e, null)
                }
            }
        }
    }
}