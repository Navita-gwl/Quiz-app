import { useState, useEffect, useRef } from 'react';
import type { QuizSettings } from './types';
import type { RecommendedProduct } from '../../utils/recommendations.server';
import { twMerge } from 'tailwind-merge';

interface ResultsStepProps {
  settings: QuizSettings;
  products?: RecommendedProduct[];
  shop: string;
  storefrontOrigin?: string;
}

interface ProductCardProps {
  product: RecommendedProduct;
  shop: string;
  storefrontOrigin?: string;
  textColor: string;
  accentColor: string;
  bgColor: string;
  borderRadius: string;
}

function ProductCard({ product, shop, storefrontOrigin, textColor, accentColor, bgColor, borderRadius }: ProductCardProps) {
  const [qty, setQty] = useState(1);
  const [addingState, setAddingState] = useState<'idle' | 'adding' | 'success' | 'error'>('idle');
  const [variantError, setVariantError] = useState('');

  const productUrl = storefrontOrigin 
    ? `${storefrontOrigin}/products/${product.handle}` 
    : `https://${shop}/products/${product.handle}`;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!product.variantId) {
      setVariantError('This product does not have a valid variant.');
      return;
    }
    setVariantError('');
    setAddingState('adding');
    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: Number(product.variantId), quantity: qty }]
        })
      });
      if (!res.ok) throw new Error('Add to cart failed');
      setAddingState('success');
      setTimeout(() => {
        setQty(1);
        setAddingState('idle');
        document.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error(err);
      setAddingState('error');
      setTimeout(() => {
        setAddingState('idle');
      }, 1500);
    }
  };

  return (
    <div
      className="gwl-quiz-product-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: bgColor,
        borderRadius,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.06)',
        color: 'inherit',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.13)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
      }}
    >
      <a
        href={productUrl}
        target="_top"
        style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        {/* Product image */}
        <div
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            overflow: 'hidden',
            backgroundColor: '#f5f5f5',
            flexShrink: 0,
          }}
        >
          {product.featuredImage ? (
            <img
              src={product.featuredImage.url}
              alt={product.featuredImage.altText || product.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ccc',
                fontSize: '13px',
              }}
            >
              No image
            </div>
          )}
        </div>

        {/* Product info */}
        <div style={{ padding: '12px 12px 6px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: textColor,
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {product.title}
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: accentColor,
              marginTop: 'auto',
              paddingTop: '6px',
            }}
          >
            {product.currencyCode}{' '}
            {parseFloat(product.price).toFixed(2)}
          </div>
        </div>
      </a>

      {/* Add to Cart Controls
      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: accentColor,
            color: '#fff',
            borderRadius: borderRadius,
            overflow: 'hidden',
            height: '38px',
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (qty > 1) setQty(qty - 1);
            }}
            style={{
              border: 'none',
              background: 'none',
              color: '#fff',
              width: '38px',
              height: '100%',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
            }}
          >
            −
          </button>
          <button
            type="button"
            disabled={addingState === 'adding'}
            onClick={handleAddToCart}
            style={{
              border: 'none',
              background: 'none',
              color: addingState === 'success' ? '#4caf50' : addingState === 'error' ? '#f44336' : '#fff',
              flex: 1,
              height: '100%',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'center',
              padding: 0,
            }}
          >
            {addingState === 'adding'
              ? 'Adding...'
              : addingState === 'success'
              ? 'Added! ✓'
              : addingState === 'error'
              ? 'Error!'
              : qty > 1
              ? `Add to cart (${qty})`
              : 'Add to cart'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setQty(qty + 1);
            }}
            style={{
              border: 'none',
              background: 'none',
              color: '#fff',
              width: '38px',
              height: '100%',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
            }}
          >
            +
          </button>
        </div>
      </div>
      */}

      {/* View Product Button */}
      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {variantError && (
          <p
            className="gwl-quiz-inline-error"
            role="alert"
            style={{ margin: 0, fontSize: '12px', textAlign: 'center' }}
          >
            {variantError}
          </p>
        )}
        <a
          href={productUrl}
          target="_top"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: accentColor,
            color: '#fff',
            borderRadius: borderRadius,
            height: '38px',
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            textAlign: 'center',
            width: '100%',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'none';
          }}
        >
          View Product
        </a>
      </div>
    </div>
  );
}

export function ResultsStep({ settings, products = [], shop, storefrontOrigin }: ResultsStepProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 300;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const accentColor = settings.quizPrimaryColor || '#111827';
  const textColor = settings.thankYouTextColor || settings.quizTextColor || '#111111';
  const bgColor = settings.thankYouBackgroundColor || settings.quizBackgroundColor || '#ffffff';
  const borderRadius = settings.quizBorderRadius || '10px';

  const containerStyle = {
    backgroundColor: bgColor,
    borderRadius,
    maxWidth: settings.quizWidth === 'narrow' ? '600px' : '100%',
  };

  const hasProducts = products.length > 0;

  const align = settings.thankYouContentAlignment || settings.quizContentAlignment || 'left';

  return (
    <div className="w-full mx-auto" style={{ textAlign: align as any }}>
      <h4
        className={twMerge(
          'gwl-quiz-heading text-3xl font-extrabold mb-4 tracking-tight transition-all duration-700 ease-out',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        )}
        style={{ color: textColor, fontFamily: settings.quizFontFamily || 'inherit', transitionDelay: '200ms' }}
      >
        {settings.thankYouHeading || 'Thank you!'}
      </h4>

      <p
        className={twMerge(
          'gwl-quiz-subheading text-lg opacity-70 max-w-md leading-relaxed transition-all duration-700 ease-out',
          align === 'center' ? 'mx-auto' : align === 'right' ? 'ml-auto' : '',
          visible ? 'opacity-70 translate-y-0' : 'opacity-0 translate-y-3'
        )}
        style={{ color: textColor, fontFamily: settings.quizFontFamily || 'inherit', transitionDelay: '320ms' }}
      >
        {settings.thankYouBody || 'Your response has been recorded.'}
      </p>

      {/* ── Recommended Products ── */}
      {hasProducts && (
        <div
          className={twMerge(
            'gwl-quiz-recommendations mt-10 transition-all duration-700 ease-out',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
          style={{ transitionDelay: '460ms' }}
        >
          <h4
            className="gwl-quiz-heading text-2xl font-bold mb-6 text-center"
            style={{ color: textColor, fontFamily: settings.quizFontFamily || 'inherit' }}
          >
            Recommended for you
          </h4>

          <div style={{ position: 'relative', width: '100%', padding: '0 40px', boxSizing: 'border-box' }}>
            <style dangerouslySetInnerHTML={{ __html: `
              .gwl-quiz-recommendations-slider::-webkit-scrollbar {
                display: none;
              }
            ` }} />

            <button
              type="button"
              onClick={() => scroll('left')}
              style={{
                position: 'absolute',
                left: '0',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: textColor,
              }}
              aria-label="Previous Products"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>

            <button
              type="button"
              onClick={() => scroll('right')}
              style={{
                position: 'absolute',
                right: '0',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: textColor,
              }}
              aria-label="Next Products"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>

            <div
              ref={sliderRef}
              className="gwl-quiz-recommendations-slider"
              style={{
                display: 'flex',
                gap: '20px',
                overflowX: 'auto',
                scrollBehavior: 'smooth',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                padding: '4px 4px 12px 4px',
              }}
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  style={{
                    flex: '0 0 220px',
                    width: '220px',
                  }}
                >
                  <ProductCard
                    product={product}
                    shop={shop}
                    storefrontOrigin={storefrontOrigin}
                    textColor={textColor}
                    accentColor={accentColor}
                    bgColor="#ffffff"
                    borderRadius={settings.quizBorderRadius || '10px'}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
