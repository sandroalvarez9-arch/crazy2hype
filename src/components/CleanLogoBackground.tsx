import blockNationLogo from '@/assets/block-nation-logo.png';

const CleanLogoBackground = () => {
  return (
    <div className="page-logo-bg">
      <img 
        src={blockNationLogo} 
        alt="" 
        className="w-full h-full object-contain"
        style={{
          filter: 'invert(1) brightness(3) contrast(0.3) blur(0.5px)',
          opacity: 0.08
        }}
      />
    </div>
  );
};

export default CleanLogoBackground;