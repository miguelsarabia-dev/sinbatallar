// components/extra/ImageViewer.jsx
"use client";

import { useState } from 'react';
import { FaImage, FaTimes, FaChevronLeft, FaChevronRight, FaExpand } from 'react-icons/fa';

/**
 * Componente para visualizar imágenes en galería con modal discreto
 * @param {Array} images - Array de URLs de imágenes (base64 o URLs)
 * @param {String} title - Título de la galería
 * @param {Boolean} showPreview - Si mostrar preview o solo el grid (default: true)
 */
const ImageViewer = ({ images = [], title = "Imágenes", showPreview = true }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const openModal = (index) => {
    setCurrentIndex(index);
    setSelectedImage(images[index]);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    const newIndex = (currentIndex + 1) % images.length;
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const prevImage = () => {
    const newIndex = (currentIndex - 1 + images.length) % images.length;
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  return (
    <>
      {/* Grid de miniaturas con preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <FaImage className="text-blue-600" />
          <span>{title}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {images.length}
          </span>
        </div>
        
        {showPreview ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <div
                key={index}
                onClick={() => openModal(index)}
                className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
              >
                <img
                  src={image}
                  alt={`${title} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Overlay al hacer hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                  <FaExpand className="text-white text-2xl mb-1" />
                  <span className="text-white text-xs font-semibold">
                    Click para ampliar
                  </span>
                </div>
                {/* Número de imagen */}
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => openModal(index)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <FaImage />
                Ver imagen {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal discreto de imagen */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          {/* Modal Card - Tamaño discreto */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-medium bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    {currentIndex + 1} de {images.length}
                  </span>
                  <span className="text-white text-sm font-medium">
                    {title}
                  </span>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-gray-200 transition-colors bg-black/40 rounded-full p-2 backdrop-blur-sm hover:bg-black/60"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>

            {/* Imagen central */}
            <div className="flex items-center justify-center bg-gray-100 min-h-[400px] max-h-[70vh]">
              <img
                src={selectedImage}
                alt={`${title} ${currentIndex + 1}`}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>

            {/* Carrusel de navegación - Solo si hay más de 1 imagen */}
            {images.length > 1 && (
              <>
                {/* Botones de navegación */}
                <button
                  onClick={prevImage}
                  disabled={currentIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110"
                >
                  <FaChevronLeft size={20} />
                </button>
                <button
                  onClick={nextImage}
                  disabled={currentIndex === images.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110"
                >
                  <FaChevronRight size={20} />
                </button>

                {/* Miniaturas del carrusel */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent p-4">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentIndex(idx);
                          setSelectedImage(images[idx]);
                        }}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentIndex
                            ? 'border-blue-500 ring-2 ring-blue-300 scale-110'
                            : 'border-gray-300 hover:border-blue-400 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Miniatura ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Estilo para ocultar scrollbar del carrusel */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
};

export default ImageViewer;
