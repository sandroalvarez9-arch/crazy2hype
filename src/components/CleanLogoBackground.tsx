import blockNationLogo from '@/assets/block-nation-logo.png';

const CleanLogoBackground = () => {
  return (
    <div className="page-logo-bg">
      <img 
        src={blockNationLogo} 
        alt="" 
        className="w-full h-full object-contain"
        style={{
          filter: 'invert(1) brightness(2) contrast(0.5)',
          opacity: 0.1
        }}
      />
    </div>
  );
};

export default CleanLogoBackground;