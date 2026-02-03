// components/FileUploader.tsx
import { useState, useRef, useCallback } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import api from "@/lib/api";

type FileWithId = {
  id: string;
  file: File;
  previewUrl?: string;
  uploadedId?: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
};

type Props = {
  label?: string;
  onUploadSuccess: (ids: number[]) => void; // تغيير إلى array
  onUploadError?: (error: Error) => void;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // بالبايت
  preview?: boolean;
  uniqueId?: string;
};

export default function FileUploader({
  label = "Upload File",
  onUploadSuccess,
  onUploadError,
  multiple = true,
  accept = "image/*",
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB افتراضي
  preview = true,
  uniqueId = "file-upload",
}: Props) {
  const [files, setFiles] = useState<FileWithId[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // دالة لإنشاء ID فريد لكل ملف
  const generateFileId = () => 
    `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // التحقق من صحة الملف
  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${maxSize / (1024 * 1024)}MB limit`;
    }

    if (accept !== "*") {
      const acceptTypes = accept.split(',').map(type => type.trim());
      const fileType = file.type;
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      const isAccepted = acceptTypes.some(type => {
        if (type.startsWith('.')) {
          return type.toLowerCase() === fileExtension;
        }
        if (type.endsWith('/*')) {
          const category = type.split('/')[0];
          return fileType.startsWith(category + '/');
        }
        return type === fileType;
      });
      
      if (!isAccepted) {
        return `File type not allowed. Allowed: ${accept}`;
      }
    }

    return null;
  };

  // معالجة اختيار الملفات
  const handleFiles = useCallback((selectedFiles: FileList | File[]) => {
    const filesArray = Array.from(selectedFiles);
    
    // التحقق من عدد الملفات
    if (!multiple && filesArray.length > 1) {
      alert("Only one file allowed");
      return;
    }

    if (files.length + filesArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles: FileWithId[] = [];

    filesArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        alert(error);
        return;
      }

      const fileWithId: FileWithId = {
        id: generateFileId(),
        file,
        status: 'pending',
      };

      // إنشاء preview إذا كان ملف صورة
      if (preview && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFiles(prev => prev.map(f => 
            f.id === fileWithId.id 
              ? { ...f, previewUrl: e.target?.result as string }
              : f
          ));
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(fileWithId);
    });

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      
      // رفع الملفات تلقائياً
      uploadFiles(newFiles);
    }
  }, [multiple, maxFiles, files.length, preview, accept, maxSize]);

  // رفع الملفات بشكل متوازي
  const uploadFiles = async (filesToUpload: FileWithId[]) => {
    const uploadPromises = filesToUpload.map(async (fileItem) => {
      // تحديث حالة الملف إلى uploading
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: 'uploading' } : f
      ));

      try {
        const formData = new FormData();
        formData.append("file", fileItem.file);
        formData.append("original_name", fileItem.file.name);

        const res = await api.post("/media", formData, {
          headers: { 
            "Content-Type": "multipart/form-data",
            "X-File-Name": encodeURIComponent(fileItem.file.name) 
          },
        });

        const uploadedId = res.data?.data?.id;
        
        if (uploadedId) {
          // تحديث حالة الملف إلى success مع الـ ID
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'success', uploadedId }
              : f
          ));
          
          return uploadedId;
        } else {
          throw new Error("No file ID returned");
        }
      } catch (error) {
        // تحديث حالة الملف إلى error
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'error' } : f
        ));
        
        onUploadError?.(error as Error);
        return null;
      }
    });

    try {
      const results = await Promise.allSettled(uploadPromises);
      const successfulIds = results
        .filter((result): result is PromiseFulfilledResult<number> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      if (successfulIds.length > 0) {
        onUploadSuccess(successfulIds);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  // إزالة ملف
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // إعادة تعيين الـ input
  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // إحصائيات الرفع
  const uploadStats = {
    total: files.length,
    pending: files.filter(f => f.status === 'pending').length,
    uploading: files.filter(f => f.status === 'uploading').length,
    success: files.filter(f => f.status === 'success').length,
    error: files.filter(f => f.status === 'error').length,
  };

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* منطقة الـ Drag & Drop */}
      <div
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:bg-gray-50'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadCloud className={`mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-500'}`} size={28} />
        <p className="text-gray-600 text-sm text-center">
          Drag & drop files here or click to browse
        </p>
        <p className="text-gray-400 text-xs mt-1">
          {accept} • Max {maxSize / (1024 * 1024)}MB per file • Max {maxFiles} files
        </p>
        
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
              resetInput();
            }
          }}
          className="hidden"
          id={uniqueId}
          multiple={multiple}
        />
      </div>

      {/* إحصائيات الرفع */}
      {files.length > 0 && (
        <div className="mt-3 flex gap-4 text-sm text-gray-600">
          <span>Total: {uploadStats.total}</span>
          {uploadStats.uploading > 0 && (
            <span className="text-blue-600">Uploading: {uploadStats.uploading}</span>
          )}
          {uploadStats.success > 0 && (
            <span className="text-green-600">Success: {uploadStats.success}</span>
          )}
          {uploadStats.error > 0 && (
            <span className="text-red-600">Failed: {uploadStats.error}</span>
          )}
        </div>
      )}

      {/* قائمة الملفات */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((fileItem) => (
            <div
              key={fileItem.id}
              className={`flex items-center justify-between p-2 rounded border ${
                fileItem.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : fileItem.status === 'success'
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* معاينة الصورة المصغرة */}
                {fileItem.previewUrl && (
                  <div className="w-10 h-10 flex-shrink-0">
                    <img
                      src={fileItem.previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {fileItem.file.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>
                      {(fileItem.file.size / 1024).toFixed(1)} KB
                    </span>
                    <span>•</span>
                    <span className="capitalize">
                      {fileItem.status === 'uploading' && (
                        <span className="text-blue-600 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Uploading...
                        </span>
                      )}
                      {fileItem.status === 'success' && (
                        <span className="text-green-600 flex items-center gap-1">
                          ✓ Uploaded
                        </span>
                      )}
                      {fileItem.status === 'error' && (
                        <span className="text-red-600 flex items-center gap-1">
                          ✗ Failed
                        </span>
                      )}
                      {fileItem.status === 'pending' && 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {fileItem.status !== 'uploading' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(fileItem.id);
                  }}
                  className="text-gray-400 hover:text-red-500 p-1"
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* معاينة الصور كـ grid */}
      {preview && files.some(f => f.previewUrl) && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Previews</h4>
          <div className="grid grid-cols-4 gap-2">
            {files
              .filter(f => f.previewUrl)
              .map((fileItem) => (
                <div key={fileItem.id} className="relative">
                  <img
                    src={fileItem.previewUrl}
                    alt={fileItem.file.name}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity rounded-lg" />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}