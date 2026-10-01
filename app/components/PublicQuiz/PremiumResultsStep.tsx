import { useEffect, useRef } from 'react';
import type { QuizSettings } from './types';
import type { RecommendedProduct } from '../../utils/recommendations.server';

interface ResultsStepProps {
  settings: QuizSettings;
  products?: RecommendedProduct[];
  shop: string;
  storefrontOrigin?: string;
  onStartOver?: () => void;
}

interface ProductCardProps {
  product: RecommendedProduct;
  shop: string;
  storefrontOrigin?: string;
  buttonTextColor?: string;
}

function PremiumProductCard({ product, shop, storefrontOrigin, buttonTextColor }: ProductCardProps) {
  const productUrl = storefrontOrigin
    ? `${storefrontOrigin}/products/${product.handle}`
    : `https://${shop}/products/${product.handle}`;

  return (
    <div className="gwl-quiz-product-card">
      <a className="gwl-quiz-product-card-link" href={productUrl} target="_top" rel="noreferrer">
        <div className="gwl-quiz-product-card-image">
          {product.featuredImage ? (
            <img
              src={product.featuredImage.url}
              alt={product.featuredImage.altText || product.title}
            />
          ) : (
            <span>No image</span>
          )}
        </div>
        <div className="gwl-quiz-product-card-info">
          <div className="gwl-quiz-product-card-title">{product.title}</div>
          <div className="gwl-quiz-product-card-price">
            {product.currencyCode} {parseFloat(product.price).toFixed(2)}
          </div>
        </div>
      </a>
      <div className="gwl-quiz-product-card-actions">
        <button
          type="button"
          className="gwl-quiz-view-product-btn"
          style={buttonTextColor ? { color: buttonTextColor } : undefined}
          onClick={() => {
            window.top!.location.href = productUrl;
          }}
        >
          <span className="gwl-quiz-view-product-btn-label">View Product</span>
        </button>
      </div>
    </div>
  );
}

export function PremiumResultsStep({
  settings,
  products = [],
  shop,
  storefrontOrigin,
  onStartOver,
}: ResultsStepProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const hasProducts = products.length > 0;

  useEffect(() => {
    const container = document.querySelector('.gwl-quiz-container');
    if (!container) return;
    if (hasProducts) {
      container.classList.add('gwl-quiz-showing-recommendations');
    } else {
      container.classList.remove('gwl-quiz-showing-recommendations');
    }
    return () => container.classList.remove('gwl-quiz-showing-recommendations');
  }, [hasProducts]);

  const scroll = (direction: 'left' | 'right') => {
    sliderRef.current?.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: 'smooth',
    });
  };

  const recommendationHeading =
    settings.recommendationHeading || 'Recommended for you';

  return (
    <>
      <div className="gwl-quiz-results" style={{ display: 'block' }}>
        <div className="gwl-quiz-results-header">
          <div className="gwl-quiz-results-text">
            <h3 className="gwl-quiz-heading">
              {settings.thankYouHeading || 'Thank you for your answers!'}
            </h3>
            <p className="gwl-quiz-subheading">
              {settings.thankYouBody || 'We will get back to you'}
            </p>
          </div>
          {onStartOver && (
            <button
              type="button"
              className="gwl-quiz-submit-btn gwl-quiz-start-over-btn"
              onClick={onStartOver}
            >
              {settings.translations?.['navigation.startOver'] || 'Start Over'}
            </button>
          )}
        </div>
      </div>

      {hasProducts && (
        <div className="gwl-quiz-recommendations" style={{ display: 'block' }}>
          <h3 className="gwl-quiz-heading gwl-quiz-recommendations-heading">
            {recommendationHeading}
          </h3>
          {settings.recommendationSubheading && (
            <p className="gwl-quiz-recommendations-subheading">
              {settings.recommendationSubheading}
            </p>
          )}

          <div style={{ position: 'relative', width: '100%', padding: '0 40px', boxSizing: 'border-box' }}>
            <button
              type="button"
              aria-label="Scroll recommendations left"
              onClick={() => scroll('left')}
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                cursor: 'pointer',
              }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Scroll recommendations right"
              onClick={() => scroll('right')}
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                cursor: 'pointer',
              }}
            >
              ›
            </button>

            <div ref={sliderRef} className="gwl-quiz-recommendations-grid">
              {products.map((product) => (
                <div key={product.id} style={{ flex: '0 0 220px', width: 220 }}>
                  <PremiumProductCard
                    product={product}
                    shop={shop}
                    storefrontOrigin={storefrontOrigin}
                    buttonTextColor={settings.buttonTextColor}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
