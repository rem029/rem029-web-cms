import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_hero_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_version_hero_links" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_hero_links" CASCADE;
  DROP TABLE "_pages_v_version_hero_links" CASCADE;
  ALTER TABLE "card_bg" DROP CONSTRAINT "card_bg_main_image_id_media_id_fk";
  
  ALTER TABLE "card_in" DROP CONSTRAINT "card_in_main_image_id_media_id_fk";
  
  ALTER TABLE "card_r" DROP CONSTRAINT "card_r_main_image_id_media_id_fk";
  
  ALTER TABLE "pages" DROP CONSTRAINT "pages_hero_media_id_media_id_fk";
  
  ALTER TABLE "_card_bg_v" DROP CONSTRAINT "_card_bg_v_main_image_id_media_id_fk";
  
  ALTER TABLE "_card_in_v" DROP CONSTRAINT "_card_in_v_main_image_id_media_id_fk";
  
  ALTER TABLE "_card_r_v" DROP CONSTRAINT "_card_r_v_main_image_id_media_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT "_pages_v_version_hero_media_id_media_id_fk";
  
  DROP INDEX IF EXISTS "card_bg_main_main_image_idx";
  DROP INDEX IF EXISTS "card_in_main_main_image_idx";
  DROP INDEX IF EXISTS "card_r_main_main_image_idx";
  DROP INDEX IF EXISTS "pages_hero_hero_media_idx";
  DROP INDEX IF EXISTS "_card_bg_v_main_main_image_idx";
  DROP INDEX IF EXISTS "_card_in_v_main_main_image_idx";
  DROP INDEX IF EXISTS "_card_r_v_main_main_image_idx";
  DROP INDEX IF EXISTS "_pages_v_version_hero_version_hero_media_idx";
  ALTER TABLE "theme_themes" ALTER COLUMN "css" SET DEFAULT '
  @import url(''''https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Urbanist:ital,wght@0,100..900;1,100..900&display=swap'''');
  
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
    font-family: ''''Poppins'''';
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
  
  .swiper-pagination-bullet {
    background-color: var(--base);
    opacity: 0.5;
  }
  
  .swiper-pagination-bullet-active {
    background-color: var(--secondary);
    opacity: 0.5;
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
  
  .cms-hero__feature-content,
  .cms-hero__feature-overlay {
    position: absolute;  
  }
  
  .cms-hero__feature-overlay {
    background-color: #000;
    opacity: 0.3;
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
    gap: 16px;
    flex-direction: column;
    justify-content: center;
    align-items: start;
    box-sizing: border-box;  
    max-width: var(--max-width); 
    padding: 4px;
  }
  
  .cms-hero__feature-header {
    font-size: var(--size-h1);
    color: var(--secondary);
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
  
  /* ─── Responsive ───────────────────────── */
  
  @media only screen and (max-width: 768px) {
   .cms-hero__feature {
      aspect-ratio: 4 / 3;
   }  
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
    object-fit: contain;f
  }
  
  
  .cms-section{
    width: 100%;  
    background-color: #FFF;
    padding: 24px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
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
  
  /* ─── Cards Image with Overlay ───────────────────────── */
  
  .cms-card {
    display: flex;
    flex-direction: column;  
    border-radius: var(--radius-md);
    overflow: hidden;    
    height: auto;
    width: 100%;
    max-width: clamp(200px, 50vw, 280px );
    aspect-ratio: 4 / 3;
  }
  
  .cms-card-overlay,
  .cms-card-img-bg .cms-card-img  {
    width: 100%;
    height: 100%;
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
  
  .cms-card-img-bg {
    aspect-ratio: 2 / 3;
    width: 100%;  
    height: auto;
    position: relative;
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
  
  /* ─── Cards Image Inline ───────────────────────── */
  
  .cms-card-img-inline {
    aspect-ratio: unset;
    background-color: #FFF;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--info-light);
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
    font-size: var(--size-h5);
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
    font-weight: ''''200'''';
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
    font-family: ''''Urbanist'''';    
    background-color: var(--info);
    color: var(--info-foreground);
    font-size: 16px;
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
  
  .cms-form-group {
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 4px;
  }
  
  
  
  .cms-label {
    font-size: 14px;
    color: var(--info);
  }
  
  .cms-h1, 
  .cms-richtext > h1 {
    font-family: ''''Urbanist'''';
    font-size: var(--size-h1);
    width: 100%;
  }
  
  .cms-h2, 
  .cms-richtext > h2 {
    font-family: ''''Urbanist'''';
    font-size: var(--size-h2);
    width: 100%;
  }
  
  .cms-h3, 
  .cms-richtext > h3 { 
    font-family: ''''Urbanist'''';
    font-size: var(--size-h3);
    width: 100%;
    }
  
  .cms-h4, 
  .cms-richtext > h4 { 
    font-family: ''''Urbanist'''';
    font-size: var(--size-h4);
    width: 100%;
    }
  
  .cms-h5, 
  .cms-richtext > h5 { 
    font-family: ''''Urbanist'''';  
    font-size: var(--size-h5);
    width: 100%;
    }
  
  .cms-h6, 
  .cms-richtext > h6 { 
    font-family: ''''Urbanist'''';  
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
    border: 0 !important;
  }
  
  .cms-form__input-text,
  .cms-form__input-number,
  .cms-form__input-textarea,
  .cms-form__input-select,
  .cms-input[type="text"],
  .cms-textarea,
  .cms-input-select  {
    border-radius: var(--radius-md);
    border: 1px solid var(--primary-light);  
    box-sizing: border-box;
    padding: 4px 8px;
    font-size: 16px;
  }
  
  
  
  h1,h2,h3,h4,h5,h6 {
    font-family: ''''Urbanist'''';
    font-weight: ''''bold'''';      
  }
  
  p, span, blockquote {
    font-family: ''''Poppins'''';
    font-weight: 400;
    width: 100%;  
  }
  
  button {
    font-family: ''''Urbanist'''';
  }
  
  input {
    font-family: ''''Poppins'''';
  }
  ';
  ALTER TABLE "card_bg_locales" ADD COLUMN "main_image_id" integer;
  ALTER TABLE "card_bg_locales" ADD COLUMN "main_header_title" varchar;
  ALTER TABLE "card_bg_locales" ADD COLUMN "main_body_title" varchar;
  ALTER TABLE "card_bg_locales" ADD COLUMN "main_body_text" jsonb;
  ALTER TABLE "card_in_locales" ADD COLUMN "main_image_id" integer;
  ALTER TABLE "card_in_locales" ADD COLUMN "main_header_title" varchar;
  ALTER TABLE "card_in_locales" ADD COLUMN "main_body_title" varchar;
  ALTER TABLE "card_in_locales" ADD COLUMN "main_body_text" jsonb;
  ALTER TABLE "card_r_locales" ADD COLUMN "main_image_id" integer;
  ALTER TABLE "card_r_locales" ADD COLUMN "main_header_title" varchar;
  ALTER TABLE "card_r_locales" ADD COLUMN "main_body_title" varchar;
  ALTER TABLE "card_r_locales" ADD COLUMN "main_body_text" jsonb;
  ALTER TABLE "_card_bg_v_locales" ADD COLUMN "main_image_id" integer;
  ALTER TABLE "_card_bg_v_locales" ADD COLUMN "main_header_title" varchar;
  ALTER TABLE "_card_bg_v_locales" ADD COLUMN "main_body_title" varchar;
  ALTER TABLE "_card_bg_v_locales" ADD COLUMN "main_body_text" jsonb;
  ALTER TABLE "_card_in_v_locales" ADD COLUMN "main_image_id" integer;
  ALTER TABLE "_card_in_v_locales" ADD COLUMN "main_header_title" varchar;
  ALTER TABLE "_card_in_v_locales" ADD COLUMN "main_body_title" varchar;
  ALTER TABLE "_card_in_v_locales" ADD COLUMN "main_body_text" jsonb;
  ALTER TABLE "_card_r_v_locales" ADD COLUMN "main_image_id" integer;
  ALTER TABLE "_card_r_v_locales" ADD COLUMN "main_header_title" varchar;
  ALTER TABLE "_card_r_v_locales" ADD COLUMN "main_body_title" varchar;
  ALTER TABLE "_card_r_v_locales" ADD COLUMN "main_body_text" jsonb;
  DO $$ BEGIN
   ALTER TABLE "card_bg_locales" ADD CONSTRAINT "card_bg_locales_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "card_in_locales" ADD CONSTRAINT "card_in_locales_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "card_r_locales" ADD CONSTRAINT "card_r_locales_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_card_bg_v_locales" ADD CONSTRAINT "_card_bg_v_locales_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_card_in_v_locales" ADD CONSTRAINT "_card_in_v_locales_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_card_r_v_locales" ADD CONSTRAINT "_card_r_v_locales_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "card_bg_main_main_image_idx" ON "card_bg_locales" USING btree ("main_image_id","_locale");
  CREATE INDEX IF NOT EXISTS "card_in_main_main_image_idx" ON "card_in_locales" USING btree ("main_image_id","_locale");
  CREATE INDEX IF NOT EXISTS "card_r_main_main_image_idx" ON "card_r_locales" USING btree ("main_image_id","_locale");
  CREATE INDEX IF NOT EXISTS "_card_bg_v_main_main_image_idx" ON "_card_bg_v_locales" USING btree ("main_image_id","_locale");
  CREATE INDEX IF NOT EXISTS "_card_in_v_main_main_image_idx" ON "_card_in_v_locales" USING btree ("main_image_id","_locale");
  CREATE INDEX IF NOT EXISTS "_card_r_v_main_main_image_idx" ON "_card_r_v_locales" USING btree ("main_image_id","_locale");
  ALTER TABLE "card_bg" DROP COLUMN IF EXISTS "main_image_id";
  ALTER TABLE "card_bg" DROP COLUMN IF EXISTS "main_header_title";
  ALTER TABLE "card_bg" DROP COLUMN IF EXISTS "main_body_title";
  ALTER TABLE "card_bg" DROP COLUMN IF EXISTS "main_body_text";
  ALTER TABLE "card_in" DROP COLUMN IF EXISTS "main_image_id";
  ALTER TABLE "card_in" DROP COLUMN IF EXISTS "main_header_title";
  ALTER TABLE "card_in" DROP COLUMN IF EXISTS "main_body_title";
  ALTER TABLE "card_in" DROP COLUMN IF EXISTS "main_body_text";
  ALTER TABLE "card_r" DROP COLUMN IF EXISTS "main_image_id";
  ALTER TABLE "card_r" DROP COLUMN IF EXISTS "main_header_title";
  ALTER TABLE "card_r" DROP COLUMN IF EXISTS "main_body_title";
  ALTER TABLE "card_r" DROP COLUMN IF EXISTS "main_body_text";
  ALTER TABLE "pages" DROP COLUMN IF EXISTS "hero_type";
  ALTER TABLE "pages" DROP COLUMN IF EXISTS "hero_rich_text";
  ALTER TABLE "pages" DROP COLUMN IF EXISTS "hero_media_id";
  ALTER TABLE "_card_bg_v" DROP COLUMN IF EXISTS "main_image_id";
  ALTER TABLE "_card_bg_v" DROP COLUMN IF EXISTS "main_header_title";
  ALTER TABLE "_card_bg_v" DROP COLUMN IF EXISTS "main_body_title";
  ALTER TABLE "_card_bg_v" DROP COLUMN IF EXISTS "main_body_text";
  ALTER TABLE "_card_in_v" DROP COLUMN IF EXISTS "main_image_id";
  ALTER TABLE "_card_in_v" DROP COLUMN IF EXISTS "main_header_title";
  ALTER TABLE "_card_in_v" DROP COLUMN IF EXISTS "main_body_title";
  ALTER TABLE "_card_in_v" DROP COLUMN IF EXISTS "main_body_text";
  ALTER TABLE "_card_r_v" DROP COLUMN IF EXISTS "main_image_id";
  ALTER TABLE "_card_r_v" DROP COLUMN IF EXISTS "main_header_title";
  ALTER TABLE "_card_r_v" DROP COLUMN IF EXISTS "main_body_title";
  ALTER TABLE "_card_r_v" DROP COLUMN IF EXISTS "main_body_text";
  ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_hero_type";
  ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_hero_rich_text";
  ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_hero_media_id";
  DROP TYPE "public"."enum_pages_hero_links_link_type";
  DROP TYPE "public"."enum_pages_hero_links_link_appearance";
  DROP TYPE "public"."enum_pages_hero_type";
  DROP TYPE "public"."enum__pages_v_version_hero_links_link_type";
  DROP TYPE "public"."enum__pages_v_version_hero_links_link_appearance";
  DROP TYPE "public"."enum__pages_v_version_hero_type";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_hero_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_hero_links_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "public"."enum_pages_hero_type" AS ENUM('none', 'highImpact', 'mediumImpact', 'lowImpact');
  CREATE TYPE "public"."enum__pages_v_version_hero_links_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_version_hero_links_link_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "public"."enum__pages_v_version_hero_type" AS ENUM('none', 'highImpact', 'mediumImpact', 'lowImpact');
  CREATE TABLE IF NOT EXISTS "pages_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_pages_hero_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "enum_pages_hero_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE IF NOT EXISTS "_pages_v_version_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__pages_v_version_hero_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar,
  	"link_appearance" "enum__pages_v_version_hero_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  ALTER TABLE "card_bg_locales" DROP CONSTRAINT "card_bg_locales_main_image_id_media_id_fk";
  
  ALTER TABLE "card_in_locales" DROP CONSTRAINT "card_in_locales_main_image_id_media_id_fk";
  
  ALTER TABLE "card_r_locales" DROP CONSTRAINT "card_r_locales_main_image_id_media_id_fk";
  
  ALTER TABLE "_card_bg_v_locales" DROP CONSTRAINT "_card_bg_v_locales_main_image_id_media_id_fk";
  
  ALTER TABLE "_card_in_v_locales" DROP CONSTRAINT "_card_in_v_locales_main_image_id_media_id_fk";
  
  ALTER TABLE "_card_r_v_locales" DROP CONSTRAINT "_card_r_v_locales_main_image_id_media_id_fk";
  
  DROP INDEX IF EXISTS "card_bg_main_main_image_idx";
  DROP INDEX IF EXISTS "card_in_main_main_image_idx";
  DROP INDEX IF EXISTS "card_r_main_main_image_idx";
  DROP INDEX IF EXISTS "_card_bg_v_main_main_image_idx";
  DROP INDEX IF EXISTS "_card_in_v_main_main_image_idx";
  DROP INDEX IF EXISTS "_card_r_v_main_main_image_idx";
  ALTER TABLE "theme_themes" ALTER COLUMN "css" SET DEFAULT '
  @import url(''''https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Urbanist:ital,wght@0,100..900;1,100..900&display=swap'''');
  
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
    font-family: ''''Poppins'''';
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
    object-fit: contain;f
  }
  
  
  .cms-section{
    width: 100%;  
    background-color: #FFF;
    padding: 24px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
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
  
  /* ─── Cards Image with Overlay ───────────────────────── */
  
  .cms-card {
    display: flex;
    flex-direction: column;  
    border-radius: var(--radius-md);
    overflow: hidden;    
    height: auto;
    width: 100%;
    max-width: clamp(200px, 50vw, 280px );
    aspect-ratio: 4 / 3;
  }
  
  .cms-card-overlay,
  .cms-card-img-bg .cms-card-img  {
    width: 100%;
    height: 100%;
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
  
  .cms-card-img-bg {
    aspect-ratio: 2 / 3;
    width: 100%;  
    height: auto;
    position: relative;
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
  
  /* ─── Cards Image Inline ───────────────────────── */
  
  .cms-card-img-inline {
    aspect-ratio: unset;
    background-color: #FFF;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--info-light);
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
    font-size: var(--size-h5);
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
    font-weight: ''''200'''';
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
  .cms-btn-outline
   {
    box-sizing: border-box;
    border-radius: var(--radius-full);
    font-family: ''''Urbanist'''';    
    background-color: var(--info);
    color: var(--info-foreground);
    font-size: 16px;
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
  
  .cms-btn-primary {
    background-color: var(--primary);
    color: var(--primary-foreground);
  }
  
  .cms-btn-primary:hover {
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
  
  .cms-form-group {
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 4px;
  }
  
  .cms-input[type="text"],
  .cms-textarea,
  .cms-input-select {
    border-radius: var(--radius-lg);
    border: 1px solid var(--primary-light);  
    box-sizing: border-box;
    padding: 4px 8px;
    font-size: 16px;
  }
  
  .cms-label {
    font-size: 14px;
    color: var(--info);
  }
  
  .cms-h1, 
  .cms-richtext > h1 {
    font-family: ''''Urbanist'''';
    font-size: var(--size-h1);
    width: 100%;
  }
  
  .cms-h2, 
  .cms-richtext > h2 {
    font-family: ''''Urbanist'''';
    font-size: var(--size-h2);
    width: 100%;
  }
  
  .cms-h3, 
  .cms-richtext > h3 { 
    font-family: ''''Urbanist'''';
    font-size: var(--size-h3);
    width: 100%;
    }
  
  .cms-h4, 
  .cms-richtext > h4 { 
    font-family: ''''Urbanist'''';
    font-size: var(--size-h4);
    width: 100%;
    }
  
  .cms-h5, 
  .cms-richtext > h5 { 
    font-family: ''''Urbanist'''';  
    font-size: var(--size-h5);
    width: 100%;
    }
  
  .cms-h6, 
  .cms-richtext > h6 { 
    font-family: ''''Urbanist'''';  
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
  
  h1,h2,h3,h4,h5,h6 {
    font-family: ''''Urbanist'''';
    font-weight: ''''bold'''';      
  }
  
  p, span, blockquote {
    font-family: ''''Poppins'''';
    font-weight: 400;
    width: 100%;  
  }
  
  button {
    font-family: ''''Urbanist'''';
  }
  
  input {
    font-family: ''''Poppins'''';
  }
  ';
  ALTER TABLE "card_bg" ADD COLUMN "main_image_id" integer;
  ALTER TABLE "card_bg" ADD COLUMN "main_header_title" varchar;
  ALTER TABLE "card_bg" ADD COLUMN "main_body_title" varchar;
  ALTER TABLE "card_bg" ADD COLUMN "main_body_text" jsonb;
  ALTER TABLE "card_in" ADD COLUMN "main_image_id" integer;
  ALTER TABLE "card_in" ADD COLUMN "main_header_title" varchar;
  ALTER TABLE "card_in" ADD COLUMN "main_body_title" varchar;
  ALTER TABLE "card_in" ADD COLUMN "main_body_text" jsonb;
  ALTER TABLE "card_r" ADD COLUMN "main_image_id" integer;
  ALTER TABLE "card_r" ADD COLUMN "main_header_title" varchar;
  ALTER TABLE "card_r" ADD COLUMN "main_body_title" varchar;
  ALTER TABLE "card_r" ADD COLUMN "main_body_text" jsonb;
  ALTER TABLE "pages" ADD COLUMN "hero_type" "enum_pages_hero_type" DEFAULT 'none';
  ALTER TABLE "pages" ADD COLUMN "hero_rich_text" jsonb;
  ALTER TABLE "pages" ADD COLUMN "hero_media_id" integer;
  ALTER TABLE "_card_bg_v" ADD COLUMN "main_image_id" integer;
  ALTER TABLE "_card_bg_v" ADD COLUMN "main_header_title" varchar;
  ALTER TABLE "_card_bg_v" ADD COLUMN "main_body_title" varchar;
  ALTER TABLE "_card_bg_v" ADD COLUMN "main_body_text" jsonb;
  ALTER TABLE "_card_in_v" ADD COLUMN "main_image_id" integer;
  ALTER TABLE "_card_in_v" ADD COLUMN "main_header_title" varchar;
  ALTER TABLE "_card_in_v" ADD COLUMN "main_body_title" varchar;
  ALTER TABLE "_card_in_v" ADD COLUMN "main_body_text" jsonb;
  ALTER TABLE "_card_r_v" ADD COLUMN "main_image_id" integer;
  ALTER TABLE "_card_r_v" ADD COLUMN "main_header_title" varchar;
  ALTER TABLE "_card_r_v" ADD COLUMN "main_body_title" varchar;
  ALTER TABLE "_card_r_v" ADD COLUMN "main_body_text" jsonb;
  ALTER TABLE "_pages_v" ADD COLUMN "version_hero_type" "enum__pages_v_version_hero_type" DEFAULT 'none';
  ALTER TABLE "_pages_v" ADD COLUMN "version_hero_rich_text" jsonb;
  ALTER TABLE "_pages_v" ADD COLUMN "version_hero_media_id" integer;
  DO $$ BEGIN
   ALTER TABLE "pages_hero_links" ADD CONSTRAINT "pages_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_pages_v_version_hero_links" ADD CONSTRAINT "_pages_v_version_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "pages_hero_links_order_idx" ON "pages_hero_links" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "pages_hero_links_parent_id_idx" ON "pages_hero_links" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "_pages_v_version_hero_links_order_idx" ON "_pages_v_version_hero_links" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "_pages_v_version_hero_links_parent_id_idx" ON "_pages_v_version_hero_links" USING btree ("_parent_id");
  DO $$ BEGIN
   ALTER TABLE "card_bg" ADD CONSTRAINT "card_bg_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "card_in" ADD CONSTRAINT "card_in_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "card_r" ADD CONSTRAINT "card_r_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_card_bg_v" ADD CONSTRAINT "_card_bg_v_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_card_in_v" ADD CONSTRAINT "_card_in_v_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_card_r_v" ADD CONSTRAINT "_card_r_v_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_hero_media_id_media_id_fk" FOREIGN KEY ("version_hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "card_bg_main_main_image_idx" ON "card_bg" USING btree ("main_image_id");
  CREATE INDEX IF NOT EXISTS "card_in_main_main_image_idx" ON "card_in" USING btree ("main_image_id");
  CREATE INDEX IF NOT EXISTS "card_r_main_main_image_idx" ON "card_r" USING btree ("main_image_id");
  CREATE INDEX IF NOT EXISTS "pages_hero_hero_media_idx" ON "pages" USING btree ("hero_media_id");
  CREATE INDEX IF NOT EXISTS "_card_bg_v_main_main_image_idx" ON "_card_bg_v" USING btree ("main_image_id");
  CREATE INDEX IF NOT EXISTS "_card_in_v_main_main_image_idx" ON "_card_in_v" USING btree ("main_image_id");
  CREATE INDEX IF NOT EXISTS "_card_r_v_main_main_image_idx" ON "_card_r_v" USING btree ("main_image_id");
  CREATE INDEX IF NOT EXISTS "_pages_v_version_hero_version_hero_media_idx" ON "_pages_v" USING btree ("version_hero_media_id");
  ALTER TABLE "card_bg_locales" DROP COLUMN IF EXISTS "main_image_id";
  ALTER TABLE "card_bg_locales" DROP COLUMN IF EXISTS "main_header_title";
  ALTER TABLE "card_bg_locales" DROP COLUMN IF EXISTS "main_body_title";
  ALTER TABLE "card_bg_locales" DROP COLUMN IF EXISTS "main_body_text";
  ALTER TABLE "card_in_locales" DROP COLUMN IF EXISTS "main_image_id";
  ALTER TABLE "card_in_locales" DROP COLUMN IF EXISTS "main_header_title";
  ALTER TABLE "card_in_locales" DROP COLUMN IF EXISTS "main_body_title";
  ALTER TABLE "card_in_locales" DROP COLUMN IF EXISTS "main_body_text";
  ALTER TABLE "card_r_locales" DROP COLUMN IF EXISTS "main_image_id";
  ALTER TABLE "card_r_locales" DROP COLUMN IF EXISTS "main_header_title";
  ALTER TABLE "card_r_locales" DROP COLUMN IF EXISTS "main_body_title";
  ALTER TABLE "card_r_locales" DROP COLUMN IF EXISTS "main_body_text";
  ALTER TABLE "_card_bg_v_locales" DROP COLUMN IF EXISTS "main_image_id";
  ALTER TABLE "_card_bg_v_locales" DROP COLUMN IF EXISTS "main_header_title";
  ALTER TABLE "_card_bg_v_locales" DROP COLUMN IF EXISTS "main_body_title";
  ALTER TABLE "_card_bg_v_locales" DROP COLUMN IF EXISTS "main_body_text";
  ALTER TABLE "_card_in_v_locales" DROP COLUMN IF EXISTS "main_image_id";
  ALTER TABLE "_card_in_v_locales" DROP COLUMN IF EXISTS "main_header_title";
  ALTER TABLE "_card_in_v_locales" DROP COLUMN IF EXISTS "main_body_title";
  ALTER TABLE "_card_in_v_locales" DROP COLUMN IF EXISTS "main_body_text";
  ALTER TABLE "_card_r_v_locales" DROP COLUMN IF EXISTS "main_image_id";
  ALTER TABLE "_card_r_v_locales" DROP COLUMN IF EXISTS "main_header_title";
  ALTER TABLE "_card_r_v_locales" DROP COLUMN IF EXISTS "main_body_title";
  ALTER TABLE "_card_r_v_locales" DROP COLUMN IF EXISTS "main_body_text";`)
}
