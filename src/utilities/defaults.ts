export const defaultThemeCSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Urbanist:ital,wght@0,100..900;1,100..900&display=swap');

:root {
  --background: #FFFBEF;
  --foreground: #5D5D5D;

  --card: 240 5% 96%;
  --card-foreground: 222.2 84% 4.9%;

  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;

   /* ─── Primary (deep green) ───────────────────────── */
  --primary: #102721;                 
  --primary-foreground: #FFFFFF;

  --primary-light: color-mix(in srgb, var(--primary) 50%, #FFF);           
  --primary-light-foreground: var(--primary-dark);

  --primary-dark: color-mix(in srgb, var(--primary) 50%, #000);            
  --primary-dark-foreground: #FFFFFF;

  
  --secondary: #F7CF6B;               
  --secondary-foreground: #1F1F1F;    

  --secondary-light: color-mix(in srgb, var(--secondary) 50%, #FFF);                 
  --secondary-light-foreground: var(--secondary-dark);

  --secondary-dark: color-mix(in srgb, var(--secondary) 50%, #000); 
  --secondary-dark-foreground: white;

  
  --base: #5D5D5D;                    
  --base-foreground: #FFFFFF;

  --base-light: color-mix(in srgb, var(--base) 50%, #FFF);
  --base-light-foreground: var(--base-dark);

  --base-dark: color-mix(in srgb, var(--base) 50%, #000);               
  --base-dark-foreground: #FFFFFF;

  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;

  --border: 240 6% 80%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;

  --radius: 8px;
  --radius-sm: var(--radius);
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --radius-full: 9999px;

  --success: #69bd59;
  --success-foreground: #FFFFFF;

  --success-light: color-mix(in srgb, var(--success) 50%, #FFF);
  --success-light-foreground: var(--success-dark);

  --success-dark: color-mix(in srgb, var(--success) 50%, #000);    
  --success-dark-foreground: #FFFFFF;

  --warning: #e1ec45;
  --warning-foreground: #5A5A5A;

  --warning-light: color-mix(in srgb, var(--warning) 50%, #FFF);
  --warning-light-foreground: var(--warning-dark);

  --warning-dark: color-mix(in srgb, var(--warning) 50%, #000);
  --warning-dark-foreground: #FFFFFF;

  --info: #979797;
  --info-foreground: #FFFFFF;

  --info-light: color-mix(in srgb, var(--info) 50%, #FFF); 
  --info-light-foreground: var(--info-dark);

  --info-dark: color-mix(in srgb, var(--info) 50%, #000);
  --info-dark-foreground: #FFFFFF;

  --error: #d8716c;
  --error-foreground: #FFFFFF;

  --error-light: color-mix(in srgb, var(--error) 50%, #FFF);    
  --error-light-foreground: var(--error-dark);

  --error-dark: color-mix(in srgb, var(--error) 50%, #000);        
  --error-dark-foreground: #FFFFFF;

  --max-width: 1024px;

  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;

  --size-h1: clamp(36px, 5vw, 56px);
  --size-h2: clamp(32px, 4vw, 48px);
  --size-h3: clamp(28px, 3.5vw, 40px);
  --size-h4: clamp(24px, 3vw, 32px);
  --size-h5: clamp(20px, 2.5vw, 24px);
  --size-h6: clamp(14px, 2vw, 16px);
  --size-p-sm: clamp(14px, 1.5vw, 18px);
  --size-p-md: clamp(16px, 1.5vw, 18px);
  --size-p-lg: clamp(16px, 1.5vw, 20px);
  --size-blockquote: clamp(14px, 2vw, 16px);
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-xxl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}




* {
  font-family: 'Poppins';
}

.cms-header{
  min-height: 72px;
  height: 72px;
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

.cms-header__logo img {
  object-fit: contain;
}

.cms-header__nav{}

.cms-header__nav-item{
  color: var(--primary-foreground);
  padding: 0px 4px;
  font-size: 16px;
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
  color: var(--primary-foreground);
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
  color: var(--primary-foreground);
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

.cms-header__drawer-footer__social-item {
  width: 16px;
  height: auto;
}

.cms-header__drawer-footer__social-item svg {
  width: 100%;
  height: auto;
  color: var(--secondary);
}

.cms-hero {
  width: 100%;
  height: max-content;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cms-hero__carousel-navigation {
    display: flex;
    justify-content: center;
    width: 100%;
    margin-top: 16px;
}

.swiper-pagination{
  position: unset;
}

.swiper-pagination-bullet {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin: 0 4px;
    border-radius: 50%;
    cursor: pointer;
    background-color: var(--base);
    opacity: 0.5;
}

.swiper-pagination-bullet-active {
    opacity: 1;
    background-color: var(--secondary);
}

.cms-hero__carousel {
  width: 100%;  
  height: 100%;  
  position: relative;
}

.cms-hero__carousel-slide {
  width: max-content;
  box-sizing: border-box;
  padding: 0px 0px;
}

.cms-hero__feature {
  position: relative;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 1;
}

.cms-hero__feature .cms-link {
  color: var(--secondary); 
}

.cms-hero__feature-content,
.cms-hero__feature-overlay {
  position: absolute;  
}

.cms-hero__feature-overlay {
  background: rgba(0, 0, 0, 0.01);
  background: linear-gradient(to top, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0));

  opacity: 0.5;
  width: 100%;
  height: 100%;
}

.cms-hero__feature-content {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  display: flex;
  gap: 8px;
  flex-direction: column;
  justify-content: end;
  align-items: start;
  box-sizing: border-box;  
  max-width: var(--max-width); 
  padding: 4px;
}

.cms-hero__feature-header {
  font-size: var(--size-h3);
  color: white;
}
.cms-hero__feature-body {
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: start;
  gap: 8px;
  color: white;
}
.cms-hero__feature-body-title {
  font-size: var(--size-h6);
}
.cms-hero__feature-body-text {
  font-size: var(--size-p-md);
}
.cms-hero__feature-footer {
  padding: 8px 0px;
}

.cms-hero__feature img {
  object-fit: cover;
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

.cms-multimedia {
  position: relative;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background-color: var(--info);
}

.cms-multimedia img {
  object-fit: contain;
}


.cms-section {
  width: 100%;  
  background-color: transparent;
  padding: 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cms-section__container {
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

.cms-footer__section {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  width: 100%;
}

.cms-footer__address {
  font-weight: 200;
  font-size: 12px;
  color: var(--primary-foreground);
}

.cms-footer_copyright p,
.cms-footer_copyright a,
.cms-footer_copyright a:visited {
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

.cms-footer__logo {
  width: 96px;
  height: auto;
}

.cms-footer__logo img {
  object-fit: contain;}

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

/* ─── Locale Switch Styles ───────────────────────── */

.cms-header__locale__select,
.cms-footer__locale__select {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;  
}

.cms-header__locale__select span,
.cms-footer__locale__select span, 
.cms-header__locale__select-item,
.cms-footer__locale__select-item {
  font-size: 12px;
  color: #FFF;
}

/* ─── Cards Image with Overlay ───────────────────────── */

.cms-card {
  display: flex;
  flex-direction: column;  
  border-radius: var(--radius-md);
  overflow: hidden;    
  height: auto;
  aspect-ratio: 4 / 3;
}

.cms-card-img-bg {
  aspect-ratio: 2 / 3;
  width: 100%;  
  max-width: clamp(200px, 50vw, 280px );
  height: auto;
  position: relative;
}

.cms-card-img-bg .cms-link {
  color: var(--secondary);
}

.cms-card-overlay {
  background-color: var(--primary);
  opacity: 0.5;
  width: 100%;
  height: 100%;
}

.cms-card .cms-card-overlay {
  z-index: 1;
}
.cms-card-img-bg .cms-card-img{
  z-index: 0;  
 }



.cms-card-img-bg .cms-card-header {
  color: var(--primary-foreground);
}

.cms-card-img-bg .cms-card-body {
  color: var(--primary-foreground);
}

.cms-card-img-bg .cms-card-body .cms-card-title {
  font-weight: bold;
}

.cms-card-img-bg .cms-card-img img {
  object-fit: cover;
}

.cms-card-img-bg .cms-card-img,
.cms-card-img-bg .cms-card-overlay {  
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;  
}

.cms-card-img-bg .cms-card-header,
.cms-card-img-bg .cms-card-body,
.cms-card-img-bg .cms-card-footer {
  z-index: 2;
}

.cms-card-img-bg .cms-card-footer {
  font-size: var(--size-p);
  color: var(--secondary);
}

/* ─── Cards Image Inline ───────────────────────── */

.cms-card-img-inline {
  aspect-ratio: unset;
  background-color: #FFF;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--info-light);

  width: 100%;
  max-width: clamp(200px, 50vw, 280px );
}

.cms-card-img-inline .cms-card-img {
  position: relative;
  display: block;
  aspect-ratio: 4 / 3;
  width: 100%;
  height:auto;  
}

.cms-card-img-inline .cms-card-img img {
  object-fit: cover;
}

.cms-card-img-inline .cms-card-body .cms-card-title {
  font-weight: bold;
}

/* ─── Cards Row Direction ───────────────────────── */

.cms-card-row {
  display: flex;
  flex-direction: row;  
  align-items: center;
  justify-content: center;

  max-width: 480px;
  width: 100%;
  height: 100%;
  min-height: 96px;  

  aspect-ratio: unset;
  background-color: #FFF;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--info-light);
}

.cms-card-row .cms-card-img {
  position: relative;
  display: block;

  aspect-ratio: 4 / 3;
  width: 100%;
  height:auto;  
}

.cms-card-row .cms-card-img img {
  object-fit: cover;
}

.cms-card-row .cms-card-body {
  width: 100%;
  height: 100%;
}

.cms-card-header,
.cms-card-body,
.cms-card-footer {  
  padding: 8px 8px;
  font-size: var(--size-p);
}

.cms-card-header h6 {
  width: max-content;
}

.cms-card-body {  
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: start;
  gap: 8px;
  padding: 16px 8px;
}

.cms-card-body-end {
  justify-content: end;
}

.cms-card-body-center {
  justify-content: center;
}

.cms-card-body-start {
  justify-content: start;
}

.cms-card-title {  
  font-size: var(--size-h6);
}
.cms-card-text {
  font-size: var(--size-p-sm);  
}

/* ─── Alerts ───────────────────────── */

.cms-alert {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;

  padding: 4px 16px;
  background-color: var(--primary-light);  
  color: var(--primary-light-foreground);
  border-radius: var(--radius);
  font-size: 14px;
}

.cms-alert svg {
  width: 24px;
  height: 24px;
}

.cms-alert-info {
  background-color: var(--info-light);  
  color: var(--info-light-foreground);
}

.cms-alert-success {
  background-color: var(--success-light);  
  color: var(--success-light-foreground);
}

.cms-alert-warning {
  background-color: var(--warning-light);  
  color: var(--warning-light-foreground);
}

.cms-alert-error {
  background-color: var(--error-light);  
  color: var(--error-light-foreground);
}


.cms-link, 
.cms-richtext > a
,a  {
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

.cms-btn,
.cms-btn-primary,
.cms-btn-secondary,
.cms-btn-outline,
.cms-btn-form
 {
  box-sizing: border-box;
  border-radius: var(--radius-full);
  font-family: 'Urbanist';    
  background-color: var(--info);
  color: var(--info-foreground);
  font-size: var(--size-p);
  padding: 8px 24px;
  box-shadow: var(--shadow-md);
  transition: all 0.2s ease;
  cursor: pointer;
  height: min-content;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.cms-btn:hover {
  background-color: var(--info-foreground);
  color: var(--info);
}

.cms-btn-primary,
.cms-btn-form {
  background-color: var(--primary);
  color: var(--primary-foreground);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.cms-btn-primary:hover,
.cms-btn-form:hover {
  background-color: var(--primary-foreground);
  color: var(--primary);
}

.cms-btn-secondary {
  background-color: var(--secondary);
  color: var(--secondary-foreground);
}

.cms-btn-secondary:hover {
  background-color: var(--secondary-foreground);
  color: var(--secondary);
}

.cms-btn-outline {
  background-color: transparent;
  color: var(--primary);
  border: 1px solid var(--primary);
  box-shadow: unset;
}

.cms-btn-outline:hover {
  background-color: var(--primary);
  color: var(--primary-foreground);
}

.cms-btn-sm {  
  font-size: 14px;  
  padding: 4px 4px;
}

.cms-btn-lg {  
  font-size: 18px;  
  padding: 12px 36px;
}

.cms-btn-disabled,
.cms-btn[disabled],
.cms-btn-primary[disabled],
.cms-btn-secondary[disabled]  {
  opacity: 0.5;
  background-color: var(--info-light);
  color: var(--info-light-foreground);
  box-shadow: unset;
  cursor: not-allowed;
}




.cms-label {
  font-size: 14px;
  color: var(--info);
}

.cms-h1, 
.cms-richtext > h1 {
  font-family: 'Urbanist';
  font-size: var(--size-h1);
  width: 100%;
}

.cms-h2, 
.cms-richtext > h2 {
  font-family: 'Urbanist';
  font-size: var(--size-h2);
  width: 100%;
}

.cms-h3, 
.cms-richtext > h3 { 
  font-family: 'Urbanist';
  font-size: var(--size-h3);
  width: 100%;
  }

.cms-h4, 
.cms-richtext > h4 { 
  font-family: 'Urbanist';
  font-size: var(--size-h4);
  width: 100%;
  }

.cms-h5, 
.cms-richtext > h5 { 
  font-family: 'Urbanist';  
  font-size: var(--size-h5);
  width: 100%;
  }

.cms-h6, 
.cms-richtext > h6 { 
  font-family: 'Urbanist';  
  font-size: var(--size-h6);
  width: 100%;
  }

.cms-p, 
p, 
.cms-richtext > h6 {
  font-size: var(--size-p-sm);
  width: 100%;
}

.cms-p-sm {
  font-size: var(--size-p-sm);
  width: 100%;
}

.cms-p-md {
  font-size: var(--size-p-md);
  width: 100%;
}

.cms-p-lg {
  font-size: var(--size-p-lg);
  width: 100%;
}

.cms-blockquote, blockquote {
  font-style: italic;
  font-size: var(--size-blockquote);
  opacity: .5;
}

.cms-caption {
  font-style: italic;
  font-size: var(--size-caption);
  opacity: .5;
}

.cms-form {
  margin: 0 auto;
  width: 100%;
  max-width: 480px;
  border: 0 !important;
  margin-bottom: 24px;
}

.cms-form-success-message {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: center;
  justify-content: center;
  align-items: center;
}

.cms-form-success-message h1,
.cms-form-success-message h2,
.cms-form-success-message h3,
.cms-form-success-message h4,
.cms-form-success-message h5,
.cms-form-success-message h6 {
  color: var(--primary);
}

.cms-form-success-message svg {
   color: var(--primary);
   width: 96px;
}

.cms-form form {
  display: flex;
  align-items: start;
  justify-content: start;
  flex-direction: column;
  gap: 24px;
  flex: 1;
  width: 100%;
}

.cms-form .cms-btn-form {
  width: 100%;
}

.cms-form input,
.cms-form textarea,
.cms-form select {
  background-color: transparent;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  border: 0;
  padding: 0;
  outline: none;
}

.cms-form > input:active,
.cms-form > textarea:active {
  outline: none;
}

.cms-form__input-control {
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: start;
  gap: 4px;
}

.cms-form__input-control label {  
  font-size: 12px;
  color: var(--info);
}

.cms-form__input {
  display: flex;
  flex-direction: row;
  justify-content: start;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: max-content;

  padding: 4px 8px;
  box-sizing: border-box;
  border-radius: var(--radius-md);
  border: 1px solid var(--primary); 
  background-color: white;
}

.cms-form__input-rounded {
  border-radius: var(--radius-full);
}

.cms-form__input-control svg {
  color: var(--primary-light);
  width: 16px;
  font-size: 16px;
}

.cms-form__input-control input[type=text],
.cms-form__input-control input[type=number],
.cms-form__input-control input[type=email]
 {
  width: 100%;
  height: 24px;
  font-size: 16px;  
}

.cms-form__input-control textarea {
  text-align: left;
  width: 100%;
  font-size: 16px; 
}

h1,h2,h3,h4,h5,h6 {
  font-family: 'Urbanist';
  font-weight: 'bold';      
}

p, span, blockquote {
  font-family: 'Poppins';
  font-weight: 400;
  width: 100%;  
}

button {
  font-family: 'Urbanist';
}




/* ─── Responsive ───────────────────────── */

@media only screen and (max-width: 768px) {
    .cms-header__locale__select {
      display: none;
    }

    .cms-hero__feature {
      aspect-ratio: 4 / 3;
    }

    .cms-hero__feature-content {
      gap: 4px;
      padding: 24px;
    }

    .cms-section__container {    
      gap: 8px;
    }

    .cms-btn,
    .cms-btn-primary,
    .cms-btn-secondary,
    .cms-btn-outline,
    .cms-btn-form {
      padding: 4px 16px;
      font-size: 16px;
    }
  }
`

export const defaultFooterCopyRight = {
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,

    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,

        children: [
          {
            mode: 'normal',
            text: 'Powered by ',
            type: 'text',
            style: '',
            detail: 0,
            format: 0,
            version: 1,
          },

          {
            id: '6819e62eb0cf3f707c6b2938',
            type: 'link',

            fields: {
              url: 'https://github.com/rem029',
              newTab: false,
              linkType: 'custom',
            },
            format: '',
            indent: 0,
            version: 3,

            children: [
              {
                mode: 'normal',
                text: 'rem029',
                type: 'text',
                style: '',
                detail: 0,
                format: 0,
                version: 1,
              },
            ],
            direction: 'ltr',
          },
        ],
        direction: 'ltr',
        textStyle: '',
        textFormat: 0,
      },

      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,

        children: [],
        direction: 'ltr',
        textStyle: '',
        textFormat: 0,
      },
    ],
    direction: 'ltr',
  },
}
