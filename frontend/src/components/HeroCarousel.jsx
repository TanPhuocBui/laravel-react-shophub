import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { categoryUrl } from '../utils/catalog';

const slides = [
  { eyebrow: 'CÔNG NGHỆ CHO NGÀY MỚI', title: <>Nâng tầm công việc.<br />Bật chất riêng.</>, text: 'Laptop cho học tập, công việc và những ý tưởng lớn. Tìm chiếc máy đồng hành cùng bạn.', category: 'laptop', label: 'Khám phá Laptop', image: 'asus-vivobook.jpg', theme: 'tech', detail: 'HỌC TẬP · LÀM VIỆC · SÁNG TẠO' },
  { eyebrow: 'GÓC LÀM VIỆC CỦA BẠN', title: <>Nâng cấp nhỏ.<br />Khác biệt lớn.</>, text: 'Linh kiện, bàn phím và phụ kiện để mỗi góc làm việc đều mang dấu ấn riêng.', category: 'linh-kien-phu-kien', label: 'Khám phá phụ kiện', image: 'keyboard.jpg', theme: 'accessories', detail: 'LINH KIỆN · PHỤ KIỆN · KẾT NỐI' },
  { eyebrow: 'TIỆN NGHI TRONG TẦM TAY', title: <>Nhà gọn hơn.<br />Ngày nhẹ hơn.</>, text: 'Những thiết bị thiết thực cho căn bếp và không gian sống. Thêm tiện nghi mỗi ngày.', category: 'thiet-bi-gia-dung', label: 'Khám phá gia dụng', image: 'philips-kettle.jpg', theme: 'appliances', detail: 'CHĂM CHÚT TỪNG GÓC NHÀ' },
];

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (paused || hovered || focused || reduced) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused, hovered, focused, reduced, index]);
  const slide = slides[index];
  return (
    <div className={`deal-carousel ${slide.theme}`} id="dealCarousel" aria-label="Khám phá ShopHub" aria-roledescription="trình chiếu" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className="deal-slide active" role="group" aria-roledescription="trang chiếu" aria-label={`${index + 1} / ${slides.length}`}>
        <div className="deal-media"><img src={`/images/catalog/${slide.image}`} alt="" /></div>
        <div className="deal-body">
          <span className="tag tag-gold">{slide.eyebrow}</span><h2>{slide.title}</h2><p>{slide.text}</p>
          <div className="deal-price">{slide.detail}</div>
          <Link className="btn-bz btn-gold" to={categoryUrl(slide.category)}>{slide.label}<Icon name="arrow" /></Link>
        </div>
      </div>
      <button className="deal-arrow prev" onClick={() => setIndex((index + slides.length - 1) % slides.length)} aria-label="Banner trước"><Icon name="chevron" className="reverse" /></button>
      <button className="deal-arrow next" onClick={() => setIndex((index + 1) % slides.length)} aria-label="Banner tiếp theo"><Icon name="chevron" /></button>
      <div className="deal-dots" aria-label="Chọn banner">{slides.map((item, i) => <button key={item.category} aria-label={`Banner ${i + 1}`} aria-pressed={i === index} onClick={() => setIndex(i)} />)}</div>
      <button className="carousel-pause" onClick={() => setPaused(!paused)} aria-label={paused || reduced ? 'Bật tự chuyển banner' : 'Tạm dừng banner'} aria-pressed={paused} disabled={reduced}>{paused || reduced ? '▶' : 'Ⅱ'}</button>
    </div>
  );
}
