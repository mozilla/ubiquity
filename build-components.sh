#! /bin/sh

cd ${TOPSRCDIR} && \
rm -rf browser/components/ubiquity && \
mkdir browser/components/ubiquity && \
cp -R ${UBIQDIR}/components/* browser/components/ubiquity && \
cd ${OBJDIR} && \
${TOPSRCDIR}/build/autoconf/make-makefile \
  -t ${TOPSRCDIR} browser/components/ubiquity && \
cd ${OBJDIR}/browser/components/ubiquity && \
make
