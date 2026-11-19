import { Link } from 'react-router-dom';
import PixelIcon from './PixelIcon';

export const APP_NAME = 'Sidequest';

/** Sidequest logo: pixel pin + wordmark. Renders a link when `to` is given. */
const Brand = ({ to, className = '', onClick }) => {
  const content = (
    <>
      <PixelIcon name="pin" className="" />
      {APP_NAME}
    </>
  );
  const cls = `sq-brand ${className}`.trim();
  return to
    ? <Link to={to} className={cls} onClick={onClick}>{content}</Link>
    : <span className={cls}>{content}</span>;
};

export default Brand;
