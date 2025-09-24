import blockNationLogo from '@/assets/block-nation-logo.png';

const CleanLogoBackground = () => {
  return (
    <div className="page-logo-bg">
      <img 
        src={blockNationLogo} 
        alt="" 
        className="w-full h-full object-contain"
        style={{
          filter: 'brightness(10) contrast(1.5) saturate(0)',
          mixBlendMode: 'overlay',
          opacity: 0.15
        }}
      />
    </div>
  );
};

export default CleanLogoBackground;