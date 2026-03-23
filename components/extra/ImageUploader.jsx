// components/extra/ImageUploader.jsx
"use client";

import { useState, useRef } from 'react';
import { FaCamera, FaTimes, FaImage, FaFileImage } from 'react-icons/fa';

/**
 * Componente reutilizable para subir y comprimir imágenes
 * @param {Array} images - Array de archivos de imagen
 * @param {Function} onChange - Callback cuando cambian las imágenes
 * @param {Number} maxImages - Máximo de imágenes permitidas (default: 5)
 * @param {Number} maxSize - Tamaño máximo por imagen en bytes (default: 5MB)
 * @param {Boolean} required - Si es requerido al menos una imagen
 */
const ImageUploader = ({ 
  images = [], 
  onChange, 
  maxImages = 5, 
  maxSize = 5 * 1024 * 1024,
  required = false,
  label = "Agregar imágenes"
}) => {
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Función para comprimir imagen (igual que SolicitarServicioMejorado)
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Redimensionar si es muy grande
          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir a blob con compresión
          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.85 // Calidad de compresión (85%)
          );
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Manejar selección de archivos
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    if (images.length + files.length > maxImages) {
      setError(`Solo puedes subir un máximo de ${maxImages} imágenes`);
      return;
    }

    try {
      const processedFiles = [];
      const newPreviews = [];
      
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setError(`El archivo ${file.name} no es una imagen válida`);
          continue;
        }

        // Comprimir la imagen
        const compressedFile = await compressImage(file);
        
        if (compressedFile.size > maxSize) {
          setError(`La imagen ${file.name} es muy grande. Intenta con una imagen de menor resolución.`);
          continue;
        }
        
        processedFiles.push(compressedFile);
        
        // Crear preview
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push(e.target.result);
          if (newPreviews.length === processedFiles.length) {
            setPreviews([...previews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(compressedFile);
      }

      if (processedFiles.length > 0) {
        onChange([...images, ...processedFiles]);
        setError('');
      }
    } catch (err) {
      console.error('Error procesando imágenes:', err);
      setError('Error al procesar las imágenes. Por favor intenta nuevamente.');
    }

    // Reset input
    e.target.value = '';
  };

  // Eliminar imagen
  const handleRemoveImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    onChange(newImages);
    setPreviews(newPreviews);
    setError('');
  };

  // Iniciar cámara
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Cámara trasera por defecto
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accediendo a la cámara:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  // Parar cámara
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  // Tomar foto
  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `photo-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      // Comprimir la imagen tomada
      const compressedFile = await compressImage(file);
      
      if (compressedFile.size > maxSize) {
        setError('La foto es muy grande. Intenta tomar otra.');
        return;
      }

      // Agregar a las imágenes
      const newImages = [...images, compressedFile];
      onChange(newImages);

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews([...previews, e.target.result]);
      };
      reader.readAsDataURL(compressedFile);

      stopCamera();
      setError('');
    }, 'image/jpeg', 0.85);
  };

  return (
    <div className="space-y-3">
      {/* Modal de cámara */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Tomar Foto</h3>
              <button
                onClick={stopCamera}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="relative mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={takePhoto}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <FaCamera />
                Tomar Foto
              </button>
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botones de subida */}
      <div className="flex gap-2">
        <label className={`flex-1 cursor-pointer ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={images.length >= maxImages}
          />
          <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-all ${
            images.length >= maxImages 
              ? 'border-gray-300 bg-gray-100 text-gray-400'
              : 'border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100'
          }`}>
            <FaFileImage />
            <span className="text-sm font-medium">Seleccionar</span>
          </div>
        </label>
        
        <button
          type="button"
          onClick={startCamera}
          disabled={images.length >= maxImages}
          className={`px-4 py-3 rounded-lg border-2 border-dashed transition-all flex items-center gap-2 ${
            images.length >= maxImages 
              ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'border-green-300 bg-green-50 text-green-600 hover:bg-green-100'
          }`}
        >
          <FaCamera />
          <span className="text-sm font-medium">Cámara</span>
        </button>
      </div>

      {/* Contador */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {images.length} de {maxImages} imágenes
        </span>
        {required && images.length === 0 && (
          <span className="text-red-500 text-xs">* Requerido</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Preview de imágenes */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mensaje informativo */}
      {images.length === 0 && (
        <div className="text-center py-4 text-gray-400">
          <FaImage className="text-3xl mx-auto mb-2" />
          <p className="text-xs">No hay imágenes seleccionadas</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
