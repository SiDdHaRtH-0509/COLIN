import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  X,
  Star,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  FileImage,
  Trash2,
  Crown,
} from 'lucide-react';
import {
  PropertyPhoto,
  MAX_PHOTOS_PER_PROPERTY,
  validatePropertyPhotoFile,
  readPropertyFileAsDataUrl,
} from '../../utils/propertyImageStorage';

interface PropertyPhotoUploaderProps {
  photos: PropertyPhoto[];
  onChange: (photos: PropertyPhoto[]) => void;
  ownerId?: string;
  propertyId?: string;
  disabled?: boolean;
}

export const PropertyPhotoUploader: React.FC<PropertyPhotoUploaderProps> = ({
  photos,
  onChange,
  ownerId = 'usr-owner-01',
  propertyId = 'temp-prop',
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = MAX_PHOTOS_PER_PROPERTY - photos.length;
  const isFull = remainingSlots <= 0;

  // Process selected or dropped files
  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setErrorMessage(null);
      const incomingFiles = Array.from(fileList);

      if (incomingFiles.length === 0) return;

      if (isFull) {
        setErrorMessage(
          `Maximum upload limit reached (${MAX_PHOTOS_PER_PROPERTY} photos). Remove an existing photo to upload new ones.`
        );
        return;
      }

      // Check capacity
      if (incomingFiles.length > remainingSlots) {
        setErrorMessage(
          `You selected ${incomingFiles.length} photos, but only ${remainingSlots} slot${
            remainingSlots > 1 ? 's are' : ' is'
          } remaining. Only the first ${remainingSlots} valid photo${
            remainingSlots > 1 ? 's' : ''
          } will be added.`
        );
      }

      const filesToProcess = incomingFiles.slice(0, remainingSlots);
      setIsProcessing(true);

      const newPhotos: PropertyPhoto[] = [];
      const errors: string[] = [];

      for (const file of filesToProcess) {
        // Validate
        const validation = validatePropertyPhotoFile(file);
        if (!validation.valid) {
          errors.push(validation.error || `File ${file.name} is invalid.`);
          continue;
        }

        // Prevent duplicate file selection by name and size
        const isDuplicate = photos.some((p) => p.name === file.name && p.size === file.size);
        if (isDuplicate) {
          errors.push(`"${file.name}" is already uploaded.`);
          continue;
        }

        try {
          const dataUrl = await readPropertyFileAsDataUrl(file);
          const isFirstPhoto = photos.length === 0 && newPhotos.length === 0;

          newPhotos.push({
            id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            propertyId,
            ownerId,
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl,
            isCover: isFirstPhoto,
            createdAt: new Date().toISOString(),
          });
        } catch {
          errors.push(`Failed to read "${file.name}".`);
        }
      }

      setIsProcessing(false);

      if (errors.length > 0) {
        setErrorMessage(errors.join(' '));
      }

      if (newPhotos.length > 0) {
        const updated = [...photos, ...newPhotos];
        // Ensure at least one cover photo
        if (!updated.some((p) => p.isCover)) {
          updated[0].isCover = true;
        }
        onChange(updated);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [photos, remainingSlots, isFull, ownerId, propertyId, onChange]
  );

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isFull) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isFull) {
      setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isFull) return;

    if (e.dataTransfer && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Trigger file selection
  const handleBrowseClick = () => {
    if (disabled || isFull) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Remove photo
  const handleRemovePhoto = (id: string) => {
    const photoToRemove = photos.find((p) => p.id === id);
    const filtered = photos.filter((p) => p.id !== id);

    // If removed photo was cover, make first remaining photo the cover
    if (photoToRemove?.isCover && filtered.length > 0) {
      filtered[0].isCover = true;
    }

    onChange(filtered);
    setErrorMessage(null);
  };

  // Set as Cover
  const handleSetCover = (id: string) => {
    const updated = photos.map((p) => ({
      ...p,
      isCover: p.id === id,
    }));
    onChange(updated);
  };

  // Reorder Left / Up
  const handleMoveLeft = (index: number) => {
    if (index <= 0) return;
    const reordered = [...photos];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    onChange(reordered);
  };

  // Reorder Right / Down
  const handleMoveRight = (index: number) => {
    if (index >= photos.length - 1) return;
    const reordered = [...photos];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    onChange(reordered);
  };

  return (
    <div className="space-y-4">
      {/* Header with Photo Counter & Capacity HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-colin-charcoal-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-colin-navy uppercase tracking-wider font-display flex items-center gap-2">
              <FileImage size={17} className="text-colin-orange" />
              <span>Property Photographs</span>
            </h4>
            <span
              className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                isFull
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : photos.length > 0
                  ? 'bg-colin-teal/15 text-colin-teal-800 border border-colin-teal/30'
                  : 'bg-colin-charcoal-100 text-colin-charcoal-600'
              }`}
            >
              {photos.length}/{MAX_PHOTOS_PER_PROPERTY} Photos Added
            </span>
          </div>
          <p className="text-[11px] text-colin-charcoal-500 mt-0.5">
            Upload genuine, high-quality photographs of rooms, study areas, attached baths, and dining facilities.
          </p>
        </div>

        <div className="text-right shrink-0">
          <span
            className={`text-[11px] font-bold ${
              isFull ? 'text-amber-700' : 'text-colin-teal-700'
            }`}
          >
            {isFull
              ? 'Maximum 8 photographs reached'
              : `${remainingSlots} slot${remainingSlots > 1 ? 's' : ''} remaining`}
          </span>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-3 text-rose-900 text-xs animate-fadeIn">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-semibold">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 p-1"
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer ${
          isFull
            ? 'border-colin-charcoal-200 bg-colin-charcoal-50/70 cursor-not-allowed opacity-80'
            : isDragging
            ? 'border-colin-orange bg-colin-orange/5 shadow-brand-hover scale-[1.005]'
            : 'border-colin-charcoal-300 hover:border-colin-navy hover:bg-colin-navy-50/40 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          disabled={disabled || isFull}
          className="hidden"
          aria-label="Upload property photographs"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-transform ${
              isDragging
                ? 'bg-colin-orange text-white scale-110'
                : 'bg-colin-navy-50 text-colin-navy'
            }`}
          >
            <UploadCloud size={28} className={isDragging ? 'text-white' : 'text-colin-teal'} />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-extrabold text-colin-navy">
              {isFull ? (
                'Photo Limit Reached (8/8)'
              ) : isDragging ? (
                'Drop Photographs Here'
              ) : (
                <>
                  Add photographs of your property
                </>
              )}
            </p>
            <p className="text-xs text-colin-charcoal-500 leading-relaxed">
              {isFull ? (
                'You have reached the maximum allowed limit of 8 photos. Delete a thumbnail below to replace.'
              ) : (
                'Drag and drop images here or browse your device.'
              )}
            </p>
          </div>

          {!isFull && (
            <button
              type="button"
              disabled={disabled}
              className="inline-flex items-center gap-2 px-4 py-2 bg-colin-navy hover:bg-colin-navy-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <UploadCloud size={14} className="text-colin-orange" />
              <span>Browse Files</span>
            </button>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-colin-charcoal-400 font-medium">
            <span>JPG, JPEG, PNG, WEBP supported</span>
            <span>•</span>
            <span>Maximum 8 photographs</span>
            <span>•</span>
            <span>Up to 5 MB per photo</span>
          </div>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-xs font-bold text-colin-navy">
              <div className="w-4 h-4 border-2 border-colin-teal border-t-transparent rounded-full animate-spin" />
              <span>Optimizing and loading images...</span>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnails Grid Preview & Management */}
      {photos.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-colin-navy uppercase tracking-wider">
              Selected Photo Gallery ({photos.length})
            </span>
            <span className="text-[11px] text-colin-charcoal-500">
              The first or starred photo will be your listing cover photo on search cards.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photos.map((photo, index) => {
              const sizeInKb = (photo.size / 1024).toFixed(0);
              const isCover = photo.isCover || index === 0;

              return (
                <div
                  key={photo.id}
                  className={`group relative rounded-2xl overflow-hidden border transition-all bg-white shadow-sm flex flex-col justify-between ${
                    isCover
                      ? 'border-2 border-colin-orange shadow-md ring-2 ring-colin-orange/20'
                      : 'border-colin-charcoal-200 hover:border-colin-charcoal-400'
                  }`}
                >
                  {/* Thumbnail Image Container */}
                  <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Cover Photo Badge */}
                    {isCover ? (
                      <div className="absolute top-2 left-2 bg-colin-orange text-colin-navy-950 font-black text-[10px] px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1 z-10 uppercase tracking-wider">
                        <Crown size={12} className="fill-colin-navy-950" />
                        <span>Cover Photo</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCover(photo.id)}
                        className="absolute top-2 left-2 bg-colin-navy-950/70 hover:bg-colin-navy text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10"
                        title="Set as Primary Cover Photo"
                      >
                        <Star size={11} className="text-colin-orange" />
                        <span>Set as Cover</span>
                      </button>
                    )}

                    {/* Delete / Remove Action */}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-2 right-2 w-7 h-7 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center shadow-md transition-transform hover:scale-110 z-10"
                      title="Remove this photograph"
                      aria-label={`Remove photograph ${photo.name}`}
                    >
                      <Trash2 size={13} />
                    </button>

                    {/* Order Controls Overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-colin-navy-950/80 via-colin-navy-950/40 to-transparent p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveLeft(index)}
                          className={`w-6 h-6 rounded bg-white/20 hover:bg-white text-white hover:text-colin-navy flex items-center justify-center transition-colors ${
                            index === 0 ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                          title="Move Left"
                          aria-label="Move photo left"
                        >
                          <ArrowLeft size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={index === photos.length - 1}
                          onClick={() => handleMoveRight(index)}
                          className={`w-6 h-6 rounded bg-white/20 hover:bg-white text-white hover:text-colin-navy flex items-center justify-center transition-colors ${
                            index === photos.length - 1 ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                          title="Move Right"
                          aria-label="Move photo right"
                        >
                          <ArrowRight size={12} />
                        </button>
                      </div>

                      <span className="text-[10px] text-white font-bold">
                        #{index + 1}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Info Footer */}
                  <div className="p-2 bg-white flex items-center justify-between text-[10px] text-colin-charcoal-500">
                    <span className="truncate max-w-[100px] font-medium" title={photo.name}>
                      {photo.name}
                    </span>
                    <span className="shrink-0 font-bold text-colin-charcoal-400">
                      {sizeInKb} KB
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
