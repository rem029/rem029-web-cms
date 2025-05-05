import { Setting } from '@/payload-types'
import Link from 'next/link'
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaPinterest,
  FaTiktok,
  FaTwitter,
  FaYoutube,
} from 'react-icons/fa'

export interface SocialMediaProps {
  classNameContainer: string
  classNameItem: string
  socialMedia: Setting['socialMedia']
  fullWidth?: boolean
}

export const SocialMedia = ({
  classNameContainer,
  classNameItem,
  socialMedia,
  fullWidth,
}: SocialMediaProps) => {
  if (!socialMedia) return <></>

  return (
    <div className={`${classNameContainer} ${fullWidth ? 'w-full' : ''}`}>
      {socialMedia?.facebook && (
        <Link href={socialMedia.facebook} className={classNameItem} target="_blank">
          <FaFacebook />
        </Link>
      )}
      {socialMedia?.twitter && (
        <Link href={socialMedia.twitter} className={classNameItem} target="_blank">
          <FaTwitter />
        </Link>
      )}
      {socialMedia?.instagram && (
        <Link href={socialMedia.instagram} className={classNameItem} target="_blank">
          <FaInstagram />
        </Link>
      )}
      {socialMedia?.linkedin && (
        <Link href={socialMedia.linkedin} className={classNameItem} target="_blank">
          <FaLinkedin />
        </Link>
      )}
      {socialMedia?.youtube && (
        <Link href={socialMedia.youtube} className={classNameItem} target="_blank">
          <FaYoutube />
        </Link>
      )}
      {socialMedia?.pinterest && (
        <Link href={socialMedia.pinterest} className={classNameItem} target="_blank">
          <FaPinterest />
        </Link>
      )}
      {socialMedia?.tiktok && (
        <Link href={socialMedia.tiktok} className={classNameItem} target="_blank">
          <FaTiktok />
        </Link>
      )}
    </div>
  )
}
