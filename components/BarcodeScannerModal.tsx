import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import Icon from './Icon';
import { Tooltip } from './Tooltip';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // If the modal is being closed, ensure any active scanner is stopped.
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      return;
    }

    const codeReader = new BrowserMultiFormatReader();

    const startScanner = async () => {
      try {
        const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (videoInputDevices.length === 0) {
          setError('No camera found on this device.');
          return;
        }
        
        let selectedDeviceId = videoInputDevices[0].deviceId;
        const rearCamera = videoInputDevices.find(device => /back|rear|environment/i.test(device.label));
        if (rearCamera) {
          selectedDeviceId = rearCamera.deviceId;
        }

        if (videoRef.current) {
          setError(null);
          // Start decoding and store the controls to be able to stop the scanner later.
          controlsRef.current = await codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, err) => {
            if (result) {
              onScan(result.getText());
              // onScan will trigger onClose from the parent, which cleans up the scanner via this effect.
            }
            if (err && err.name !== 'NotFoundException') {
              // Ignore NotFoundException as it's very common during scanning.
              console.error("Barcode scanning error:", err);
              setError('An error occurred while scanning.');
            }
          });
        }
      } catch (err) {
        let message = 'Could not access camera. Please grant permission.';
        if (err instanceof Error && err.name === 'NotAllowedError') {
            message = 'Camera access was denied. Please allow it in your browser settings.';
        }
        setError(message);
        console.error("Camera access error:", err);
      }
    };

    startScanner();

    // Cleanup function: this will be called when the component unmounts or `isOpen` changes.
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, [isOpen, onScan, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-[80] p-4">
      <div className="relative w-full max-w-lg bg-black rounded-lg overflow-hidden shadow-2xl">
        <video ref={videoRef} className="w-full h-auto" />
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 h-1/3 border-4 border-dashed border-white/50 rounded-lg"></div>
        </div>
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-scan"></div>
        <style>{`
          @keyframes scan-anim {
            0% { transform: translateY(-80px); }
            100% { transform: translateY(80px); }
          }
          .animate-scan { animation: scan-anim 2s linear infinite alternate; }
        `}</style>

        {error && <p className="absolute bottom-4 left-4 right-4 bg-red-500/80 text-white p-2 text-sm text-center rounded">{error}</p>}
        <Tooltip content="Close scanner" position="bottom">
            <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/75">
              <Icon name="close" className="w-6 h-6" />
            </button>
        </Tooltip>
      </div>
      <p className="text-white mt-4 font-semibold">Align barcode within the frame</p>
    </div>
  );
};

export default BarcodeScannerModal;