export const defaultThemeCSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Urbanist:ital,wght@0,100..900;1,100..900&display=swap');

:root {
  --background: #FFFBEF;
  --foreground: #5D5D5D;

  --card: 240 5% 96%;
  --card-foreground: 222.2 84% 4.9%;

  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;

  --primary: #102721;
  --primary-foreground: white;

  --secondary: #F7CF6B;
  --secondary-foreground: 222.2 47.4% 11.2%;

  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;

  --base: #5D5D5D;
  --base-foreground: #FFF;              

  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;

  --border: 240 6% 80%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;

  --radius: 0.2rem;

  --success: #69bd59;
  --success-foreground: #FFF;

  --warning: #e1ec45;
  --warning-foreground: #5a5a5a;

  --info: #979797;
  --info-foreground: #FFF;

  --error: #d8716c;
  --error-foreground: #FFF;

  --max-width: 1024px;

    --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}

* {
  font-family: 'Poppins';
}

.cms-header{
  min-height: 96px;
  height: 96px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--primary);
}

.cms-header__container{
  min-height: 100%;
  width: 100%;
  max-width: var(--max-width);
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px;
}

.cms-header__logo{
  width: 96px;
  height: auto;
}

.cms-header__nav{}

.cms-header__nav-item{
  color: var(--primary-foreground);
  padding: 0px 4px;
}

.cms-header__btn-drawer {
  background-color: var(--primary);
  color: var(--secondary);
  padding: 8px;  
}

.cms-header__btn-drawer svg {
  width: 24px;
  height: auto;
}

.cms-header__drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom-width: 1px;
}

.cms-header__drawer-header button {
  padding: 8px;
  border-radius: 9999px;
}

.cms-header__drawer{
  position: fixed;
  top: 0px;
  bottom: 0px;
  left: 0px;
  width: 100%;
  background-color: var(--primary);
  z-index: 50;
}

.cms-header__drawer-shadow {
      --tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    --tw-shadow-colored: 0 10px 15px -3px var(--tw-shadow-color), 0 4px 6px -4px var(--tw-shadow-color);
    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.cms-header__drawer__nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}

.cms-header__drawer__nav-item {
  padding: 4px 0px;
  display: block;
  font-size: 16px;
}

.cms-header__drawer-footer {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 16px;
  gap: 8px;
}

.cms-header__drawer-footer__address {
  font-size: 12px;
  font-weight: 200;
  color: var(--primary-foreground);
}

.cms-header__drawer-footer__social {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  width: 100%;
  gap: 16px;
}
.cms-header__drawer-footer__social-item svg {
  width: 16px;
  height: auto;
  color: var(--secondary);
}

.cms-page{
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100dvh;
  background-color: var(--background);
}

.cms-page__container{ 
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}


.cms-section{
  width: 100%;  
  background-color: #FFF;
  padding: 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: start;
}

.cms-section__container{
  width: 100%;
  max-width: var(--max-width);
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 16px;
}


.cms-footer {
  min-height: 96px;
  height: min-content;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--primary); 
}

.cms-footer__container {
  min-height: 100%;
  width: 100%;
  max-width: var(--max-width);
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: start;
  padding: 8px 16px;
  gap: 16px;
 
}
.cms-footer__address {
  font-weight: 200;
  font-size: 12px;
  color: var(--primary-foreground);
}

.cms-footer_copyright p, a{
  font-weight: 200;
  font-size: 12px;
  color: var(--primary-foreground);
}

.cms-footer__social {
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.cms-footer__social-item svg{
  width: 24px;
  height: 24px;
  color: white;
}

.cms-footer__logo{
  width: 96px;
  height: auto;
}

.cms-footer__nav{
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
}

.cms-footer__nav-item{
  color: var(--primary-foreground);
  padding: 0px 4px;
  font-size: 16px;
}


.cms-link {
  color: var(--base);
  font-weight: '200';
}

.cms-link-primary {
  color: var(--primary);
  font-weight: bold;
}

.cms-link-secondary {
  color: var(--secondary);
  font-weight: bold;
}

.cms-button{}
.cms-form-group{
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 4;
}
.cms-input[type="text"]{
  border-radius: var(--radius);
  border: 1px solid var(--primary);
  padding: 4px;
}

.cms-textarea{
  border-radius: var(--radius);
  border: 1px solid var(--primary);
  padding: 4px;
}
.cms-input-select{}
.cms-input-select{}
.cms-input-label{}

.cms-h1{
  font-family: 'Urbanist';
  font-size: 56px;
  width: 100%;
}
.cms-h2{
  font-family: 'Urbanist';
  font-size: 48px;
  width: 100%;
}
.cms-h3{ 
  font-family: 'Urbanist';
  font-size: 40px;
  width: 100%;
  }
.cms-h4{ 
  font-family: 'Urbanist';
  font-size: 32px;
  width: 100%;
  }
.cms-h5{ 
  font-family: 'Urbanist';
  font-size: 24px;
  width: 100%;
  }
.cms-h6{ 
  font-family: 'Urbanist';
  font-size: 16px;
  width: 100%;
  }
.cms-p{
  width: 100%;
}
.cms-blockquote {
  font-style: italic;
  opacity: .5;
}

h1,h2,h3,h4,h5,h6 {
  font-family: 'Urbanist';
  font-weight: 'bold';    
  color: var(--foreground);
}

p, span, blockquote {
  font-family: 'Poppins';
  font-weight: 400;
  width: 100%;
  font-size: 16px;  
}

button {
  font-family: 'Urbanist';
}

input {
  font-family: 'Poppins';
}

`
