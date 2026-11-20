import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { TopicIcon } from '../TopicIcon';
import { tutorialKinds, tutorialNames, tutorials, type TutorialKind } from './content';
import { TutorialIllustration } from './TutorialIllustration';
import { TutorialImage } from './TutorialImage';
import { useSwipeSteps } from './useSwipeSteps';
import './tutorial.css';

interface TutorialPageProps {
  kind: TutorialKind | null;
  onSelect: (kind: TutorialKind) => void;
  onReturn: () => void;
  returnLabel: string;
}

function TutorialCatalog({ onSelect }: Pick<TutorialPageProps, 'onSelect'>) {
  return (
    <div className="tutorial-catalog">
      <div className="tutorial-cards">
        {tutorialKinds.map((kind) => (
          <button className="tutorial-card" key={kind} onClick={() => onSelect(kind)}>
            <TopicIcon kind={kind} />
            <span className="tutorial-card-content">
              <strong>{tutorialNames[kind]}</strong>
              <span className="tutorial-card-description">{tutorials[kind].description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TutorialReader({
  kind,
  onReturn,
  returnLabel,
}: Omit<TutorialPageProps, 'onSelect'> & { kind: TutorialKind }) {
  const tutorial = tutorials[kind];
  const { stepIndex, dragOffset, dragging, jumping, goToStep, swipeHandlers } = useSwipeSteps(
    tutorial.steps.length,
  );
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(0);
  const progressTouch = useRef<{ id: number; index: number; x: number; y: number } | null>(null);
  const lastStep = stepIndex === tutorial.steps.length - 1;

  useLayoutEffect(() => {
    if (previousStep.current !== stepIndex) {
      stepHeading.current?.focus({ preventScroll: true });
      stepHeading.current?.closest('.tutorial-step')?.scrollTo({ top: 0 });
      previousStep.current = stepIndex;
    }
  }, [stepIndex]);

  return (
    <div className="tutorial-reader" data-tutorial={kind}>
      <span className="tutorial-step-count" aria-live="polite">
        步骤 {stepIndex + 1} / {tutorial.steps.length}
      </span>
      <nav
        className="tutorial-progress"
        aria-label="跳转到教程步骤"
        style={
          {
            '--step-count': tutorial.steps.length,
            '--step-index': stepIndex,
          } as CSSProperties
        }
      >
        {tutorial.steps.map((item, index) => (
          <button
            key={item.title}
            aria-label={`第 ${index + 1} 步：${item.title}`}
            aria-current={index === stepIndex ? 'step' : undefined}
            data-complete={index < stepIndex || undefined}
            onPointerDown={(event) => {
              if (event.pointerType === 'touch' && event.isPrimary)
                progressTouch.current = {
                  id: event.pointerId,
                  index,
                  x: event.clientX,
                  y: event.clientY,
                };
            }}
            onPointerUp={(event) => {
              const touch = progressTouch.current;
              if (!touch || touch.id !== event.pointerId) return;
              progressTouch.current = null;
              // A tap immediately after a swipe can arrive without a compatibility click.
              if (
                touch.index === index &&
                Math.hypot(event.clientX - touch.x, event.clientY - touch.y) <= 9
              )
                goToStep(index);
            }}
            onPointerCancel={() => {
              progressTouch.current = null;
            }}
            onClick={() => {
              if (index !== stepIndex) goToStep(index);
            }}
          />
        ))}
      </nav>
      <div className="tutorial-step-slider" {...swipeHandlers}>
        <div
          className="tutorial-step-track"
          data-dragging={dragging || undefined}
          data-jumping={jumping || undefined}
          style={{ transform: `translateX(calc(${-stepIndex * 100}% + ${dragOffset}px))` }}
        >
          {tutorial.steps.map((step, index) => (
            <section
              className="tutorial-step"
              key={step.title}
              inert={index !== stepIndex || undefined}
              aria-hidden={index !== stepIndex || undefined}
              aria-labelledby={`tutorial-step-heading-${index}`}
            >
              <div className="tutorial-step-copy">
                <h2
                  id={`tutorial-step-heading-${index}`}
                  ref={index === stepIndex ? stepHeading : undefined}
                  tabIndex={-1}
                >
                  {step.title}
                </h2>
                <p>{step.instruction}</p>
                {step.link && (
                  <a
                    className="tutorial-official-link"
                    href={step.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {step.link.label}
                  </a>
                )}
              </div>
              <figure className="tutorial-figure" data-screenshot={!!step.screenshot || undefined}>
                <div className="tutorial-figure-label">
                  {step.screenshot ? 'DeepSeek 官方平台' : '操作示意'}
                </div>
                <div className="tutorial-figure-content">
                  {step.screenshot ? (
                    <TutorialImage image={step.screenshot} />
                  ) : (
                    <TutorialIllustration illustration={step.illustration} kind={kind} />
                  )}
                </div>
                <figcaption>{step.caption}</figcaption>
              </figure>
            </section>
          ))}
        </div>
      </div>
      <nav className="tutorial-pagination" aria-label="教程步骤">
        <button disabled={stepIndex === 0} onClick={() => goToStep(stepIndex - 1)}>
          ← 上一步
        </button>
        <button className="primary" onClick={lastStep ? onReturn : () => goToStep(stepIndex + 1)}>
          {lastStep ? returnLabel : '下一步 →'}
        </button>
      </nav>
    </div>
  );
}

export function TutorialPage(props: TutorialPageProps) {
  return props.kind === null ? (
    <TutorialCatalog onSelect={props.onSelect} />
  ) : (
    <TutorialReader key={props.kind} {...props} kind={props.kind} />
  );
}
