import { useEffect, useState } from 'react';
import blockNationLogo from '@/assets/block-nation-logo.png';
import { removeBackground, loadImage } from '@/utils/backgroundRemoval';

const CleanLogoBackground = () => {
  const [cleanLogoUrl, setCleanLogoUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processLogo = async () => {
      try {
        setIsProcessing(true);
        
        // Load the original logo
        const response = await fetch(blockNationLogo);
        const blob = await response.blob();
        const imageElement = await loadImage(blob);
        
        // Remove background
        const cleanBlob = await removeBackground(imageElement);
        const url = URL.createObjectURL(cleanBlob);
        
        setCleanLogoUrl(url);
        setIsProcessing(false);
      } catch (error) {
        console.error('Failed to process logo:', error);
        setIsProcessing(false);
        // Fallback to using CSS filters instead
        setCleanLogoUrl(blockNationLogo);
      }
    };

    processLogo();

    // Cleanup
    return () => {
      if (cleanLogoUrl && cleanLogoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cleanLogoUrl);
      }
    };
  }, []);

  if (isProcessing) {
    return null; // Don't show anything while processing
  }

  return (
    <div className="page-logo-bg">
      <img 
        src={cleanLogoUrl || blockNationLogo} 
        alt="" 
        className={`w-full h-full object-contain ${
          cleanLogoUrl ? '' : 'filter brightness-0 invert opacity-20'
        }`}
        style={{
          mixBlendMode: 'multiply',
          filter: cleanLogoUrl ? 'none' : 'brightness(0) invert(1) opacity(0.1)'
        }}
      />
    </div>
  );
};

export default CleanLogoBackground;